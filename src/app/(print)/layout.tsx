import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resumo de Pedidos — Impressão',
}

/**
 * Minimal, chrome-free layout for printable views. Lives in its own route group
 * so it does NOT inherit the dashboard sidebar/header — what renders here is
 * exactly what prints (and what "Save as PDF" captures).
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root min-h-screen bg-white text-black">{children}</div>
}
