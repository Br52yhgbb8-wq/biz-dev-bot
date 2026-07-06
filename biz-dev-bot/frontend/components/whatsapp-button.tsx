"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"

// ── WhatsApp Configuration ──
// Replace with your actual WhatsApp number (international format, no + sign)
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""

// Pre-filled message when user opens WhatsApp
const WA_PREFILL = "Hi Uniepu! I'm interested in your solar air conditioner products. Can you send me the wholesale catalog and pricing?"

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false)

  const waUrl = WA_NUMBER
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_PREFILL)}`
    : "#"

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup bubble */}
      {open && (
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 p-5 max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Need help choosing the right product? Chat with us on WhatsApp!
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#22c35e] text-white text-sm font-medium rounded-xl transition-colors w-full justify-center"
          >
            <MessageCircle className="w-4 h-4" />
            Start Chat
          </a>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#22c35e] shadow-[0_4px_16px_rgba(37,211,102,0.35)] flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border-none"
        aria-label="Contact us on WhatsApp"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  )
}
