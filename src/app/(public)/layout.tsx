import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'

/**
 * Brand-aligned typography: Cormorant Garamond (headings) + Montserrat (body)
 * are the exact pairing used on momentocake.com.br. The CSS custom-property
 * names are retained as `--font-cormorant` and `--font-montserrat` so every
 * inline `style={{ fontFamily: 'var(--font-cormorant), ... }}` reference
 * inside the public components stays semantically honest.
 *
 * Cormorant Garamond is loaded at 400 + 500 + 600 (regular + italic for the
 * "cake" descender in the wordmark and for emphasis on totals).
 * Montserrat is loaded at 400 + 500 + 600 (most UI weights live here).
 */
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Momento Cake — Confeitaria Artesanal',
  description:
    'Acompanhe e finalize o seu pedido com a Momento Cake — confeitaria artesanal feita à mão.',
  icons: {
    icon: '/brand/favicon.ico',
    shortcut: '/brand/favicon.ico',
    apple: '/brand/logo.png',
  },
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${cormorant.variable} ${montserrat.variable}`}>
      {children}
    </div>
  )
}
