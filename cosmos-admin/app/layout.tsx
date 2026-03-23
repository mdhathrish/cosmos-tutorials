// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Sora, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'Cosmos Tutorials — Admin Portal',
  description: 'IIT Foundation Coaching Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable} ${jetbrains.variable} font-body bg-cosmos-bg text-cosmos-text antialiased`}>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161B35',
              color: '#E8EAF6',
              border: '1px solid #252D52',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#161B35' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#161B35' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
