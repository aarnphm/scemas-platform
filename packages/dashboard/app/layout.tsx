import type { Metadata } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'
import localFont from 'next/font/local'
import { TRPCProvider } from '@/lib/trpc-provider'
import { cn } from '@/lib/utils'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const mono = localFont({
  src: [
    { path: '../public/fonts/TX-02-Thin.woff2', weight: '100', style: 'normal' },
    { path: '../public/fonts/TX-02-ExtraLight.woff2', weight: '200', style: 'normal' },
    { path: '../public/fonts/TX-02-Light.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/TX-02-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/TX-02-Retina.woff2', weight: '450', style: 'normal' },
    { path: '../public/fonts/TX-02-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/TX-02-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/TX-02-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/TX-02-ExtraBold.woff2', weight: '800', style: 'normal' },
    { path: '../public/fonts/TX-02-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'),
  title: { default: 'SCEMAS', template: '%s | SCEMAS' },
  description: 'smart city environmental monitoring and alert system for Hamilton, ON',
  openGraph: { type: 'website', siteName: 'SCEMAS', locale: 'en_CA' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable, mono.variable)}>
      <body className="antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  )
}
