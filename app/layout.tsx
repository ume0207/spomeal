import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'スポミル | sports meal',
  description: '勝つ体は、食事から。スポーツ栄養管理アプリ',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `window.addEventListener('pageshow',function(e){if(e.persisted)window.location.reload();});`
        }} />
      </head>
      <body className="min-h-full bg-[#f3f4f6] text-[#1a1a1a]">
        {children}
      </body>
    </html>
  )
}
