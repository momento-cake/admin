import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Seu Pedido | Momento Cake',
  description: 'Acompanhe e confirme seu pedido Momento Cake',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${playfair.variable} ${dmSans.variable}`}>
      {children}
    </div>
  )
}
