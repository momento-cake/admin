/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isWebUsbSupported,
  findPrinterEndpoint,
  getOrRequestPrinter,
  openPrinter,
  sendBytes,
  printEscPos,
  PrinterUnavailableError,
} from '@/lib/webusb-printer'

// --- Fakes ------------------------------------------------------------------

function printerConfig() {
  return {
    interfaces: [
      // A non-printer interface with only an IN endpoint (should be skipped).
      { interfaceNumber: 0, alternate: { interfaceClass: 0xff, endpoints: [{ endpointNumber: 1, direction: 'in', type: 'bulk' }] } },
      // The printer interface with a bulk OUT endpoint.
      { interfaceNumber: 1, alternate: { interfaceClass: 0x07, endpoints: [{ endpointNumber: 2, direction: 'out', type: 'bulk' }] } },
    ],
  }
}

function fakeDevice(overrides: any = {}) {
  return {
    configuration: printerConfig(),
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    selectConfiguration: vi.fn().mockResolvedValue(undefined),
    claimInterface: vi.fn().mockResolvedValue(undefined),
    releaseInterface: vi.fn().mockResolvedValue(undefined),
    transferOut: vi.fn().mockResolvedValue({ status: 'ok', bytesWritten: 0 }),
    ...overrides,
  }
}

function stubUsb(usb: any) {
  vi.stubGlobal('navigator', { usb })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// --- isWebUsbSupported ------------------------------------------------------

describe('isWebUsbSupported', () => {
  it('is true when navigator.usb exists', () => {
    stubUsb({})
    expect(isWebUsbSupported()).toBe(true)
  })
  it('is false when navigator.usb is absent', () => {
    vi.stubGlobal('navigator', {})
    expect(isWebUsbSupported()).toBe(false)
  })
})

// --- findPrinterEndpoint ----------------------------------------------------

describe('findPrinterEndpoint', () => {
  it('selects the bulk OUT endpoint of the printer-class interface', () => {
    expect(findPrinterEndpoint(fakeDevice() as any)).toEqual({ interfaceNumber: 1, endpointNumber: 2 })
  })

  it('falls back to any interface with a bulk OUT endpoint', () => {
    const device = fakeDevice({
      configuration: {
        interfaces: [
          { interfaceNumber: 3, alternate: { interfaceClass: 0x00, endpoints: [{ endpointNumber: 4, direction: 'out', type: 'bulk' }] } },
        ],
      },
    })
    expect(findPrinterEndpoint(device as any)).toEqual({ interfaceNumber: 3, endpointNumber: 4 })
  })

  it('returns null when no bulk OUT endpoint exists', () => {
    const device = fakeDevice({
      configuration: { interfaces: [{ interfaceNumber: 0, alternate: { interfaceClass: 0x07, endpoints: [{ endpointNumber: 1, direction: 'in', type: 'bulk' }] } }] },
    })
    expect(findPrinterEndpoint(device as any)).toBeNull()
  })
})

// --- getOrRequestPrinter ----------------------------------------------------

describe('getOrRequestPrinter', () => {
  it('throws PrinterUnavailableError when WebUSB is unsupported', async () => {
    vi.stubGlobal('navigator', {})
    await expect(getOrRequestPrinter()).rejects.toBeInstanceOf(PrinterUnavailableError)
  })

  it('reuses an already-authorized printer without prompting', async () => {
    const known = fakeDevice()
    const requestDevice = vi.fn()
    stubUsb({ getDevices: vi.fn().mockResolvedValue([known]), requestDevice })
    const device = await getOrRequestPrinter()
    expect(device).toBe(known)
    expect(requestDevice).not.toHaveBeenCalled()
  })

  it('prompts via requestDevice when none are authorized yet', async () => {
    const picked = fakeDevice()
    const requestDevice = vi.fn().mockResolvedValue(picked)
    stubUsb({ getDevices: vi.fn().mockResolvedValue([]), requestDevice })
    expect(await getOrRequestPrinter()).toBe(picked)
    expect(requestDevice).toHaveBeenCalledOnce()
  })

  it('throws PrinterUnavailableError when the user cancels the picker', async () => {
    stubUsb({
      getDevices: vi.fn().mockResolvedValue([]),
      requestDevice: vi.fn().mockRejectedValue(new DOMException('No device selected', 'NotFoundError')),
    })
    await expect(getOrRequestPrinter()).rejects.toBeInstanceOf(PrinterUnavailableError)
  })
})

// --- openPrinter ------------------------------------------------------------

describe('openPrinter', () => {
  it('opens, claims the interface, and returns the endpoint', async () => {
    const device = fakeDevice()
    const target = await openPrinter(device as any)
    expect(device.open).toHaveBeenCalledOnce()
    expect(device.claimInterface).toHaveBeenCalledWith(1)
    expect(target).toEqual({ interfaceNumber: 1, endpointNumber: 2 })
  })

  it('selects configuration 1 when none is active', async () => {
    const device = fakeDevice({ configuration: undefined })
    // After selectConfiguration, expose the config so findPrinterEndpoint works.
    device.selectConfiguration = vi.fn().mockImplementation(async () => { device.configuration = printerConfig() })
    await openPrinter(device as any)
    expect(device.selectConfiguration).toHaveBeenCalledWith(1)
  })

  it('throws PrinterUnavailableError when claiming fails (driver in use)', async () => {
    const device = fakeDevice({ claimInterface: vi.fn().mockRejectedValue(new DOMException('access denied', 'SecurityError')) })
    await expect(openPrinter(device as any)).rejects.toBeInstanceOf(PrinterUnavailableError)
  })
})

// --- sendBytes --------------------------------------------------------------

describe('sendBytes', () => {
  it('transfers the payload in chunks', async () => {
    const device = fakeDevice()
    const data = new Uint8Array(40000) // > 2 * 16384
    await sendBytes(device as any, 2, data, 16384)
    expect(device.transferOut).toHaveBeenCalledTimes(3)
    expect(device.transferOut.mock.calls[0][0]).toBe(2)
  })

  it('sends a single transfer for small payloads', async () => {
    const device = fakeDevice()
    await sendBytes(device as any, 2, new Uint8Array([1, 2, 3]))
    expect(device.transferOut).toHaveBeenCalledOnce()
  })
})

// --- printEscPos ------------------------------------------------------------

describe('printEscPos', () => {
  it('runs the full flow and releases the interface', async () => {
    const device = fakeDevice()
    stubUsb({ getDevices: vi.fn().mockResolvedValue([device]), requestDevice: vi.fn() })
    await printEscPos(new Uint8Array([0x1b, 0x40]))
    expect(device.transferOut).toHaveBeenCalledOnce()
    expect(device.releaseInterface).toHaveBeenCalledWith(1)
    expect(device.close).toHaveBeenCalledOnce()
  })

  it('propagates PrinterUnavailableError when unsupported', async () => {
    vi.stubGlobal('navigator', {})
    await expect(printEscPos(new Uint8Array([1]))).rejects.toBeInstanceOf(PrinterUnavailableError)
  })

  it('ignores best-effort cleanup errors after a successful print', async () => {
    const device = fakeDevice({ releaseInterface: vi.fn().mockRejectedValue(new Error('already gone')) })
    stubUsb({ getDevices: vi.fn().mockResolvedValue([device]), requestDevice: vi.fn() })
    await expect(printEscPos(new Uint8Array([0x1b, 0x40]))).resolves.toBeUndefined()
    expect(device.transferOut).toHaveBeenCalledOnce()
  })
})
