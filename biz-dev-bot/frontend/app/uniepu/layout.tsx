import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Uniepu | Zero Grid Cost Solar Air Conditioners",
  description:
    "Direct-from-factory ACDC Hybrid Solar Air Conditioners and Water Heating Systems. Bypass the grid with seamless automatic switching between solar DC and standard 230V AC power. High dealer margins and CE certified.",

  // Open Graph / Facebook / WhatsApp / LinkedIn
  openGraph: {
    type: "website",
    url: "https://www.uniepu.tech/",
    title: "Uniepu | Zero Grid Cost Solar Air Conditioners",
    description:
      "Bypass the grid. Seamless automatic switching between solar DC and standard 230V AC power. Explore our 2026 wholesale catalog.",
    images: [
      {
        url: "/images/og-cover.jpg",
        width: 1200,
        height: 630,
        alt: "Uniepu Zero Grid Cost Solar Air Conditioners",
      },
    ],
    siteName: "Uniepu",
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Uniepu | Zero Grid Cost Solar Air Conditioners",
    description:
      "Bypass the grid. Seamless automatic switching between solar DC and standard 230V AC power. Explore our 2026 wholesale catalog.",
    images: ["/images/og-cover.jpg"],
  },

  // Additional SEO
  keywords: [
    "solar air conditioner",
    "ACDC hybrid solar",
    "zero grid cost cooling",
    "solar AC wholesale",
    "off-grid air conditioning",
    "solar water heating",
    "renewable energy HVAC",
    "拉丁美洲太阳能空调",
    "安装商太阳能空调",
  ],
  robots: "index, follow",
  authors: [{ name: "Uniepu" }],
}

export default function UniepuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/* JSON-LD Product structured data for SEO */}
      <Script id="product-structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Uniepu ACDC Hybrid Solar Air Conditioners",
            "description": "Direct-from-factory ACDC Hybrid Solar Air Conditioners and Water Heating Systems. Seamless automatic switching between solar DC and standard 230V AC power.",
            "brand": {
              "@type": "Brand",
              "name": "Uniepu"
            },
            "category": "Solar Air Conditioners & Water Heaters",
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": "387",
              "highPrice": "1500",
              "offerCount": "12",
              "availability": "https://schema.org/InStock"
            },
            "manufacturer": {
              "@type": "Organization",
              "name": "Uniepu",
              "url": "https://www.uniepu.tech"
            }
          })
        }}
      />
      {/* JSON-LD Organization structured data */}
      <Script id="organization-structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Uniepu",
            "url": "https://www.uniepu.tech",
            "description": "Factory-direct ACDC hybrid solar air conditioners and water heating systems for global wholesalers and dealers.",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+86-XXX-XXXX-XXXX",
              "contactType": "sales",
              "availableLanguage": ["English", "Spanish", "中文"]
            },
            "sameAs": [
              "https://wa.me/86XXXXXXXXX"
            ]
          })
        }}
      />
    </>
  )
}
