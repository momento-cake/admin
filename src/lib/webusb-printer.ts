/**
 * WebUSB transport for raw ESC/POS printing (Elgin i9 and compatible 80mm
 * thermal printers). Chrome/Edge + HTTPS only.
 *
 * Minimal local WebUSB typings are declared here so we don't depend on the
 * experimental `@types/w3c-web-usb` lib. `printEscPos` throws
 * `PrinterUnavailableError` for every "couldn't reach a printer" case
 * (unsupported browser, no device selected/cancelled, interface claim blocked
 * by an OS driver) so the caller can fall back to browser printing.
 */

// --- Minimal WebUSB surface -------------------------------------------------
interface UsbEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
  type: 'bulk' | 'interrupt' | 'isochronous'
}
interface UsbAlternate {
  interfaceClass: number
  endpoints: UsbEndpoint[]
}
interface UsbInterface {
  interfaceNumber: number
  alternate: UsbAlternate
}
interface UsbConfiguration {
  interfaces: UsbInterface[]
}
export interface UsbDevice {
  configuration?: UsbConfiguration
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: Uint8Array): Promise<{ status: string; bytesWritten: number }>
}
interface Usb {
  getDevices(): Promise<UsbDevice[]>
  requestDevice(options: { filters: unknown[] }): Promise<UsbDevice>
}

/** USB printer device class (USB-IF base class 0x07). */
const PRINTER_CLASS = 0x07

/** Thrown when no printer can be reached — the caller should fall back. */
export class PrinterUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrinterUnavailableError'
  }
}

function getUsb(): Usb | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as unknown as { usb?: Usb }).usb ?? null
}

export function isWebUsbSupported(): boolean {
  return getUsb() !== null
}

/**
 * Locate the bulk-OUT endpoint used for printing. Prefers an interface whose
 * class is the USB printer class (7); otherwise falls back to any interface
 * exposing a bulk-OUT endpoint. Returns null when none is found.
 */
export function findPrinterEndpoint(
  device: UsbDevice,
): { interfaceNumber: number; endpointNumber: number } | null {
  const interfaces = device.configuration?.interfaces ?? []
  const bulkOut = (iface: UsbInterface) =>
    iface.alternate.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')

  const printer = interfaces.find((i) => i.alternate.interfaceClass === PRINTER_CLASS && bulkOut(i))
  const chosen = printer ?? interfaces.find((i) => bulkOut(i))
  if (!chosen) return null
  const ep = bulkOut(chosen)!
  return { interfaceNumber: chosen.interfaceNumber, endpointNumber: ep.endpointNumber }
}

/**
 * Reuse a previously-authorized printer if present, otherwise prompt the user
 * to pick one. Throws `PrinterUnavailableError` if WebUSB is unavailable or the
 * user dismisses the picker.
 */
export async function getOrRequestPrinter(): Promise<UsbDevice> {
  const usb = getUsb()
  if (!usb) throw new PrinterUnavailableError('WebUSB não é suportado neste navegador')

  const known = await usb.getDevices()
  const already = known.find((d) => d.configuration && findPrinterEndpoint(d))
  if (already) return already

  try {
    return await usb.requestDevice({ filters: [] })
  } catch {
    // User dismissed the chooser or no device was selected.
    throw new PrinterUnavailableError('Nenhuma impressora USB selecionada')
  }
}

/** Open a device and claim its printer interface. */
export async function openPrinter(
  device: UsbDevice,
): Promise<{ interfaceNumber: number; endpointNumber: number }> {
  try {
    await device.open()
    if (!device.configuration) await device.selectConfiguration(1)
    const target = findPrinterEndpoint(device)
    if (!target) throw new PrinterUnavailableError('Interface de impressão não encontrada')
    await device.claimInterface(target.interfaceNumber)
    return target
  } catch (err) {
    if (err instanceof PrinterUnavailableError) throw err
    // claimInterface commonly fails on Windows when the OS print driver owns
    // the device — treat as "unreachable" so we fall back to browser print.
    throw new PrinterUnavailableError(
      'Não foi possível acessar a impressora USB (o driver do sistema pode estar em uso)',
    )
  }
}

/** Send bytes to the printer in chunks (default 16 KiB). */
export async function sendBytes(
  device: UsbDevice,
  endpointNumber: number,
  data: Uint8Array,
  chunkSize = 16384,
): Promise<void> {
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    await device.transferOut(endpointNumber, data.subarray(offset, offset + chunkSize))
  }
}

/**
 * Full print flow: acquire a printer, claim it, send the ESC/POS payload, then
 * release/close. `PrinterUnavailableError` signals the caller to fall back.
 */
export async function printEscPos(data: Uint8Array): Promise<void> {
  const device = await getOrRequestPrinter()
  const { interfaceNumber, endpointNumber } = await openPrinter(device)
  try {
    await sendBytes(device, endpointNumber, data)
  } finally {
    try {
      await device.releaseInterface(interfaceNumber)
      await device.close()
    } catch {
      // Best-effort cleanup — ignore.
    }
  }
}
