import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mercury",
  description: "Business Development Automation Platform",
  metadataBase: new URL("https://www.uniepu.tech"),
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
      <body>{children}</body>
    </html>
  )
}
