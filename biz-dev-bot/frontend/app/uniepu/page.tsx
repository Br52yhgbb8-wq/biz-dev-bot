"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { PRODUCTS } from "./data/products"
import { t, LANG_LABELS, LANG_FLAGS, Lang } from "./data/translations"
import { Loader2, Check, ChevronDown, ChevronUp, Globe } from "lucide-react"
import WhatsAppButton from "@/components/whatsapp-button"
import dynamic from "next/dynamic"
const CatalogSection = dynamic(() => import("@/components/catalog-section"), {
  loading: () => (
    <div className="py-24 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
    </div>
  ),
  ssr: true,
})

export default function UniepuPage() {
  const [lang, setLang] = useState<Lang>("zh")
  const [showLang, setShowLang] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<{role:string; content:string}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [mobileMenu, setMobileMenu] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", company: "", phone: "", country: "", interest: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState("")


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setFormError(t("contact.error_required", lang))
      return
    }
    setSubmitting(true)
    setFormError("")
    try {
      const res = await api.uniepu.inquiry(formData)
      if (res.success) {
        setSubmitted(true)
        setShowForm(false)
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendMessage() {
    const msg = chatMessage.trim()
    if (!msg || chatLoading) return
    setChatHistory(prev => [...prev, {role: "user", content: msg}])
    setChatMessage("")
    setChatLoading(true)
    try {
      const res = await api.uniepu.hermesChat({ message: msg, session_id: sessionId || undefined })
      setSessionId(res.session_id)
      if (typeof window !== "undefined") {
        localStorage.setItem("hermes_session_id", res.session_id)
      }
      setChatHistory(prev => [...prev, {role: "agent", content: res.reply}])
    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        role: "agent",
        content: "Network error. Please try again or contact Jackie on WhatsApp."
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const accent = "#7A899C"
  const accentHover = "#667588"

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* -- Navigation -- */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold tracking-tighter text-slate-900">UNIEPU</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#products" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">{t("nav.products", lang)}</a>
              <a href="#zero-grid" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">{t("nav.zero_grid", lang)}</a>
              <a href="#compliance" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">{t("nav.compliance", lang)}</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {/* Language Switcher */}
              <div className="relative">
                <button onClick={() => setShowLang(!showLang)} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg transition-colors bg-transparent border-none cursor-pointer" title="Switch Language">
                  <Globe className="w-4 h-4" />
                </button>
                {showLang && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[140px] z-50" onMouseLeave={() => setShowLang(false)}>
                    {(["zh", "en", "es"] as Lang[]).map((l) => (
                      <button key={l} onClick={() => { setLang(l); setShowLang(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer bg-transparent border-none ${
                          lang === l ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}>
                        <span>{LANG_FLAGS[l]}</span>
                        <span>{LANG_LABELS[l]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <a href="#contact" className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white shadow-sm transition-all"
                style={{ backgroundColor: accent }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accent}>
                {t("nav.dealer", lang)}
              </a>
            </div>
            {/* Hamburger Button (Mobile) */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenu(!mobileMenu)} className="text-slate-600 hover:text-slate-900 focus:outline-none p-2 transition-colors bg-transparent border-none cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Dropdown Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200/50 absolute top-20 left-0 w-full z-40 px-6 py-6 shadow-2xl origin-top transition-all">
            <div className="flex flex-col space-y-5 text-center">
              <a href="#products" className="text-lg font-semibold text-slate-800" onClick={() => setMobileMenu(false)}>{t("nav.products", lang)}</a>
              <a href="#zero-grid" className="text-lg font-semibold text-slate-800" onClick={() => setMobileMenu(false)}>{t("nav.zero_grid", lang)}</a>
              <a href="#compliance" className="text-lg font-semibold text-slate-800" onClick={() => setMobileMenu(false)}>{t("nav.compliance", lang)}</a>
              <hr className="border-slate-200" />
              <a href="#contact" onClick={() => setMobileMenu(false)}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white shadow-sm"
                style={{ backgroundColor: accent }}>
                {t("nav.dealer", lang)}
              </a>
              <div className="flex items-center justify-center gap-2 pt-2">
                {(["zh", "en", "es"] as Lang[]).map((l) => (
                  <button key={l} onClick={() => { setLang(l); setMobileMenu(false) }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer bg-transparent ${
                      lang === l ? "border-slate-400 bg-slate-100 font-medium text-slate-900" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}>
                    {LANG_FLAGS[l]} {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* -- Hero -- */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-20">
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset mb-8"
            style={{ color: accent, backgroundColor: "#F0F0F2", borderColor: accent }}>
            CE Certified for European Markets
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            {t("hero.title1", lang)}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t("hero.title2", lang)}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-light leading-relaxed">
            {t("hero.desc", lang)}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#products"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: "#1d1d1f" }}>
              {t("hero.btn_products", lang)}
            </a>
            <a href="#pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-full text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300">
              {t("hero.btn_pricing", lang)}
            </a>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06] pointer-events-none"
          style={{ backgroundColor: accent }} />
      </section>

            <CatalogSection lang={lang} t={t} />
      {/* - Zero Grid Tech Section - */}
      <section id="zero-grid" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-semibold tracking-wide uppercase mb-3" style={{color:"#007AFF"}}>{t("zero_grid.tag", lang)}</h2>
            <p className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("zero_grid.title", lang)}
            </p>
            <p className="mt-4 text-lg text-slate-500 font-light">
              {t("zero_grid.subtitle", lang)}
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-base text-slate-600 leading-relaxed mb-12">
              {t("zero_grid.desc", lang)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: "bolt", title: t("zero_grid.feature1", lang) },
                { icon: "dollar", title: t("zero_grid.feature2", lang) },
                { icon: "thermometer", title: t("zero_grid.feature3", lang) },
                { icon: "wifi", title: t("zero_grid.feature4", lang) },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#EEF0F2" }}>
                    <span className="text-lg">{item.icon === "bolt" ? "⚡" : item.icon === "dollar" ? "$" : item.icon === "thermometer" ? "°" : "⌖"}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 pt-2">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -- Compliance & Logistics Section -- */}
      <section id="compliance" className="py-20 bg-slate-900 font-sans">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Text Content */}
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl mb-6">
                {t("compliance.title1", lang)}<br />
                <span className="text-blue-400">{t("compliance.title2", lang)}</span>
              </h2>
              <p className="text-lg text-slate-400 font-light leading-relaxed mb-8">
                {t("compliance.desc", lang)}
              </p>
              
              <div className="space-y-6">
                {/* Feature 1 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="ml-3 text-base text-slate-300 font-medium">{t("compliance.feature1", lang)}</p>
                </div>
                {/* Feature 2 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <p className="ml-3 text-base text-slate-300 font-medium">{t("compliance.feature2", lang)}</p>
                </div>
                {/* Feature 3 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="ml-3 text-base text-slate-300 font-medium">{t("compliance.feature3", lang)}</p>
                </div>
              </div>
            </div>

            {/* Right Certification Badges */}
            <div className="bg-slate-800/50 rounded-3xl border border-slate-700/50 p-10 flex flex-col justify-center items-center relative overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50"></div>
              
              <div className="relative z-10 text-center">
                <h3 className="text-6xl font-serif font-bold text-white mb-2 tracking-widest">CE</h3>
                <p className="text-sm text-slate-400 uppercase tracking-widest mb-8">Conformité Européenne</p>
                
                <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900/80 border border-slate-600 text-sm text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors">
                  {t("compliance.view_cert", lang)}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* -- Pricing Summary Section -- */}
      <section id="pricing" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-[32px] lg:text-[36px] font-bold text-[#1d1d1f] tracking-[-0.5px] mb-4">{t("pricing.title", lang)}</h2>
            <p className="text-base" style={{ color: "#86868B" }}>{t("pricing.desc", lang)}</p>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* AC Units Table */}
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-4">ACDC Solar Air Conditioners</h3>
            <div className="overflow-x-auto mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5EA]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">BTU</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">{t("products.power", lang)}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">EXW Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">20GP</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">40HQ</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.filter(p => p.category === "ACDC Solar Air Conditioner").map((p, i) => (
                    <tr key={p.id} className="border-b border-[#F0F0F2] hover:bg-[#f9f9fb] transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-[#1d1d1f]">{p.model}</td>
                      <td className="py-3 px-4 text-sm text-[#86868b]">{p.specs[0].value}</td>
                      <td className="py-3 px-4 text-sm text-[#86868b]">208-230V / 50-60Hz</td>
                      <td className="py-3 px-4 text-sm font-bold text-right" style={{ color: accent }}>{p.exwPrice}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#86868b]">{p.containerLoads[0].qty}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#86868b]">{p.containerLoads[2].qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Water Heaters Table */}
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-4">Solar Water Heaters</h3>
            <div className="overflow-x-auto mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5EA]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868b]">Capacity</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">EXW Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">20GP</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868b]">40HQ</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.filter(p => p.category !== "ACDC Solar Air Conditioner").map((p) => (
                    <tr key={p.id} className="border-b border-[#F0F0F2] hover:bg-[#f9f9fb] transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-[#1d1d1f]">{p.model}</td>
                      <td className="py-3 px-4 text-sm text-[#86868b]">{p.category}</td>
                      <td className="py-3 px-4 text-sm text-[#86868b]">{p.specs[0].value}</td>
                      <td className="py-3 px-4 text-sm font-bold text-right" style={{ color: accent }}>{p.exwPrice}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#86868b]">{p.containerLoads[0].qty}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#86868b]">{p.containerLoads[2].qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* -- Inquiry Form Section -- */}
      <section id="contact" className="py-24 lg:py-32" style={{ backgroundColor: "#F8F8FA" }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-[32px] lg:text-[36px] font-bold text-[#1d1d1f] tracking-[-0.5px] mb-4">{t("contact.title", lang)}</h2>
            <p className="text-base" style={{ color: "#86868B" }}>
              {t("contact.desc", lang)}
            </p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-10 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${accent}20` }}>
                <Check className="w-7 h-7" style={{ color: accent }} />
              </div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">{t("contact.thanks_title", lang)}</h3>
              <p className="text-sm text-[#86868b]">{t("contact.thanks_desc", lang)}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 lg:p-10 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-2">
                  <input placeholder={t("contact.name", lang)} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all" />
                </div>
                <input placeholder={t("contact.email", lang)} type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all" />
                <input placeholder={t("contact.phone", lang)} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all" />
                <input placeholder={t("contact.company", lang)} value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all" />
                <input placeholder={t("contact.country", lang)} value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all" />
                <select value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})}
                  className="w-full h-[50px] px-4 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] transition-all bg-white">
                  <option value="">{t("contact.interest", lang)}</option>
                  <option value="Solar AC">{t("contact.interest_ac", lang)}</option>
                  <option value="Water Heater">{t("contact.interest_sh", lang)}</option>
                  <option value="Both">{t("contact.interest_both", lang)}</option>
                </select>
                <div className="lg:col-span-2">
                  <textarea placeholder={t("contact.message", lang)} rows={3} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 text-sm border border-[#E5E5EA] rounded-xl outline-none focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)] placeholder:text-[#86868b] transition-all resize-none" />
                </div>
                {formError && <p className="lg:col-span-2 text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}
                <div className="lg:col-span-2">
                  <button type="submit" disabled={submitting}
                    className="w-full h-[50px] text-base font-medium text-white rounded-xl border-none cursor-pointer transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: accent }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accent}>
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{t("contact.sending", lang)}</span></> : t("contact.submit", lang)}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* -- Footer -- */}
      <footer className="py-8 border-t border-[#F0F0F2] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tighter text-slate-900">UNIEPU</span>
          <p className="text-sm" style={{ color: "#C7C7CC" }}>{t("footer.copyright", lang)}</p>
        </div>
      </footer>
      {/* -- AI Agent Widget (Mobile Optimized) -- */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 font-sans flex flex-col items-end">
        {/* Chat Window */}
        <div className={`mb-4 w-[calc(100vw-3rem)] sm:w-96 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/40 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform origin-bottom-right ${chatOpen ? "block" : "hidden"}`}>
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center overflow-hidden shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">{t("widget.title", lang)}</h4>
                <p className="text-blue-100 text-[11px] sm:text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> {t("widget.online", lang)}
                </p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="h-64 sm:h-80 p-4 overflow-y-auto bg-slate-50/50 space-y-4">
            {chatHistory.length === 0 || (chatHistory.length === 1 && chatHistory[0].content === "") ? (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 shrink-0 flex items-center justify-center text-blue-600 text-xs font-bold">H</div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm text-sm text-slate-700 max-w-[85%]">
                  Hello! I'm Hermes, UNIEPU's AI sales assistant. I can help with pricing, shipping, and tech specs for our ACDC Hybrid Solar ACs and Water Heaters. How can I help you?
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={"w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold " + (msg.role === "user" ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-600")}>
                      {msg.role === "user" ? "U" : "H"}
                    </div>
                    <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[85%] ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 shrink-0 flex items-center justify-center text-blue-600 text-xs font-bold">H</div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                      <span className="inline-flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></span>
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <div className="relative">
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder={t("widget.placeholder", lang)} className="w-full bg-slate-50 border border-slate-200 text-sm rounded-full pl-4 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <button onClick={handleSendMessage} className="absolute right-1 top-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors border-none cursor-pointer shadow-sm">
                <svg className="w-4 h-4 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <WhatsAppButton />
        {/* Trigger Button */}
        <button onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 active:scale-95 transition-all duration-300 relative group z-50 border-none cursor-pointer">
          {!chatOpen && <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>}
          {chatOpen ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          )}
        </button>
      </div>

    </div>
  )
}