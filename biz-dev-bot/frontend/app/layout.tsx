import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mercury",
  description: "Business Development Automation Platform",
  metadataBase: new URL("https://uniepu.tech"),
  manifest: "/manifest.json",
  other: {
    "theme-color": "#7A899C",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YCPTESCBDB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YCPTESCBDB');
          `}
        </Script>
      </body>
    </html>
  )
}
