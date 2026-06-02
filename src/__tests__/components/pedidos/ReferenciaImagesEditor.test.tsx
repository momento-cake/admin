import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Stub the dropzone so we control file selection without jsdom/createObjectURL.
vi.mock('@/components/images/ImageUploadDropzone', () => ({
  ImageUploadDropzone: ({ onFilesSelected }: any) => (
    <button
      type="button"
      onClick={() => onFilesSelected([new File(['x'], 'ref.jpg', { type: 'image/jpeg' })])}
    >
      stage-file
    </button>
  ),
  UploadProgress: () => <div data-testid="upload-progress" />,
}))

const uploadMultipleImages = vi.fn()
const deleteImage = vi.fn(async () => {})
vi.mock('@/lib/storage', () => ({
  uploadMultipleImages: (...args: any[]) => uploadMultipleImages(...args),
  deleteImage: (...args: any[]) => deleteImage(...args),
}))

import { ReferenciaImagesEditor } from '@/components/pedidos/ReferenciaImagesEditor'
import { toast } from 'sonner'

const IMG = {
  id: 'img-1',
  url: 'https://x.test/a.jpg',
  storagePath: 'images/gallery/pedido-referencias/a.jpg',
  legenda: 'Topo',
}

describe('ReferenciaImagesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uploadMultipleImages.mockResolvedValue({
      successful: [
        { url: 'https://x.test/new.jpg', storagePath: 'images/gallery/pedido-referencias/new.jpg', width: 800, height: 600 },
      ],
      failed: [],
    })
  })

  it('uploads staged files to the reference folder and appends them', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(<ReferenciaImagesEditor value={[]} onChange={onChange} onCommit={onCommit} />)

    await user.click(screen.getByRole('button', { name: 'stage-file' }))
    await user.click(screen.getByRole('button', { name: /enviar 1 imagem/i }))

    await waitFor(() => expect(uploadMultipleImages).toHaveBeenCalled())
    expect(uploadMultipleImages.mock.calls[0][1]).toBe('images/gallery/pedido-referencias')

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const next = onChange.mock.calls.at(-1)![0]
    expect(next).toHaveLength(1)
    expect(next[0].storagePath).toBe('images/gallery/pedido-referencias/new.jpg')
    expect(onCommit).toHaveBeenCalled()
  })

  it('removes an image and deletes it from storage', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(<ReferenciaImagesEditor value={[IMG]} onChange={onChange} onCommit={onCommit} />)

    await user.click(screen.getByRole('button', { name: /remover imagem/i }))

    expect(onChange).toHaveBeenCalledWith([])
    expect(onCommit).toHaveBeenCalledWith([])
    await waitFor(() => expect(deleteImage).toHaveBeenCalledWith(IMG.storagePath))
  })

  it('edits a caption (onChange) and commits on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(<ReferenciaImagesEditor value={[IMG]} onChange={onChange} onCommit={onCommit} />)

    const caption = screen.getByLabelText(/legenda da imagem 1/i)
    await user.type(caption, '!')
    expect(onChange).toHaveBeenCalled()
    const updated = onChange.mock.calls.at(-1)![0]
    expect(updated[0].legenda).toContain('!')

    await user.tab() // blur
    expect(onCommit).toHaveBeenCalled()
  })

  it('renders read-only when disabled (no dropzone, no remove, caption as text)', () => {
    render(<ReferenciaImagesEditor value={[IMG]} onChange={vi.fn()} disabled />)
    expect(screen.queryByRole('button', { name: 'stage-file' })).toBeNull()
    expect(screen.queryByRole('button', { name: /remover imagem/i })).toBeNull()
    expect(screen.getByText('Topo')).toBeInTheDocument()
  })

  it('shows an empty-state message when disabled with no images', () => {
    render(<ReferenciaImagesEditor value={[]} onChange={vi.fn()} disabled />)
    expect(screen.getByText(/nenhuma imagem de referência/i)).toBeInTheDocument()
  })

  it('toasts when some uploads fail', async () => {
    const user = userEvent.setup()
    uploadMultipleImages.mockResolvedValueOnce({
      successful: [],
      failed: [{ file: new File([''], 'bad.jpg'), error: 'too big' }],
    })
    render(<ReferenciaImagesEditor value={[]} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'stage-file' }))
    await user.click(screen.getByRole('button', { name: /enviar 1 imagem/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('toasts when the upload throws', async () => {
    const user = userEvent.setup()
    uploadMultipleImages.mockRejectedValueOnce(new Error('network'))
    render(<ReferenciaImagesEditor value={[]} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'stage-file' }))
    await user.click(screen.getByRole('button', { name: /enviar 1 imagem/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao enviar imagens', expect.anything()))
  })
})
