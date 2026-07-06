"use client"

import { useState, useMemo } from "react"
import type { Lang } from "@/app/uniepu/data/translations"
import seriesData from "@/app/uniepu/data/catalog-products.json"
import { ChevronDown, Search, ArrowUpDown, X } from "lucide-react"

// ── Types ──
type CatalogCategory = "all" | "acdc" | "pvswh" | "s02" | "heatpump" | "ewh" | "collector"

interface Variant {
  name: string
  model: string
  price: string
  tags: string[]
  specs?: Record<string, string>
}

interface Series {
  category: string
  series: string
  seriesName: string
  description: string
  priceRange: string
  tags: string[]
  variants: Variant[]
}

interface CatalogSectionProps {
  lang: Lang
  t: (key: string, lang: Lang) => string
}

const FILTERS: { key: CatalogCategory; transKey: string }[] = [
  { key: "all", transKey: "catalog.filter.all" },
  { key: "acdc", transKey: "catalog.filter.acdc" },
  { key: "pvswh", transKey: "catalog.filter.pvswh" },
  { key: "s02", transKey: "catalog.filter.s02" },
  { key: "heatpump", transKey: "catalog.filter.heatpump" },
  { key: "ewh", transKey: "catalog.filter.ewh" },
  { key: "collector", transKey: "catalog.filter.collector" },
]

function parsePrice(price: string): number {
  return parseFloat(price.replace(/[^0-9.]/g, "")) || 0
}

function makeKey(series: string, variant: Variant): string {
  return `${series}||${variant.model}||${variant.price}`
}

export default function CatalogSection({ lang, t }: CatalogSectionProps) {
  const [activeFilter, setActiveFilter] = useState<CatalogCategory>("all")
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortAsc, setSortAsc] = useState<Record<string, boolean>>({})
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)

  const allSeries = seriesData as Series[]

  // Filter and search
  const query = searchQuery.toLowerCase().trim()
  const seriesList = (activeFilter === "all" ? allSeries : allSeries.filter((s) => s.category === activeFilter))
    .map((s) => {
      const variants = query
        ? s.variants.filter((v) => v.model.toLowerCase().includes(query) || v.name.toLowerCase().includes(query))
        : s.variants
      return { ...s, variants }
    })
    .filter((s) => s.variants.length > 0)

  // Toggle series expand
  const toggleSeries = (seriesKey: string) => {
    setExpandedSeries((prev) => (prev === seriesKey ? null : seriesKey))
  }

  // Toggle sort
  const toggleSort = (seriesKey: string) => {
    setSortAsc((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }))
  }

  // Toggle compare
  const toggleCompare = (series: string, variant: Variant) => {
    const key = makeKey(series, variant)
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Get selected variant data for comparison
  const compareData = useMemo(() => {
    return Array.from(compareSet).map((key) => {
      const [seriesKey, model, price] = key.split("||")
      for (const s of allSeries) {
        if (s.series !== seriesKey) continue
        for (const v of s.variants) {
          if (v.model === model && v.price === price)
            return { seriesName: s.seriesName, variant: v }
        }
      }
      return null
    }).filter(Boolean) as { seriesName: string; variant: Variant }[]
  }, [compareSet, allSeries])

  // All unique spec names for comparison
  const allSpecNames = useMemo(() => {
    const set = new Set<string>()
    compareData.forEach((d) => {
      if (d.variant.specs) Object.keys(d.variant.specs).forEach((k) => set.add(k))
    })
    return Array.from(set)
  }, [compareData])

  const totalResults = seriesList.reduce((s, x) => s + x.variants.length, 0)

  return (
    <section id="products" className="py-24 bg-white font-sans">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t("catalog.title", lang)}
          </h2>
          <p className="mt-4 text-lg text-slate-500 font-light">
            {t("catalog.desc", lang)}
          </p>
        </div>

        {/* Search + Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setExpandedSeries(null) }}
              placeholder="Search by model name..."
              className="w-full h-10 pl-9 pr-4 text-sm border border-slate-200 rounded-full outline-none focus:border-slate-400 focus:shadow-sm transition-all bg-white placeholder:text-slate-400"
            />
          </div>
          <div className="w-full sm:flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 flex-nowrap min-w-max">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setActiveFilter(f.key); setExpandedSeries(null) }}
                  className={`shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-none ${
                    activeFilter === f.key
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t(f.transKey, lang)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count + Compare bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-slate-400">{totalResults} models found</p>
          {compareSet.size >= 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="px-5 py-2 text-xs font-medium text-white rounded-full bg-blue-600 hover:bg-blue-700 transition-colors border-none cursor-pointer shadow-sm"
            >
              Compare {compareSet.size} models
            </button>
          )}
        </div>

        {/* Series Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {seriesList.map((series) => {
            const isExpanded = expandedSeries === series.series
            const variants = [...series.variants].sort(
              sortAsc[series.series]
                ? (a, b) => parsePrice(a.price) - parsePrice(b.price)
                : (a, b) => parsePrice(b.price) - parsePrice(a.price)
            )

            return (
              <div key={series.series} className="flex flex-col">
                {/* Series Main Card */}
                <div
                  onClick={() => toggleSeries(series.series)}
                  className={`group relative bg-slate-50/50 rounded-3xl p-6 lg:p-8 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer ${
                    isExpanded ? "rounded-b-none border-b-0 bg-white shadow-lg" : ""
                  }`}
                >
                  <div className="mb-4 flex flex-wrap">
                    {series.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 mr-1 mb-1">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-1">{series.seriesName}</h3>
                      <p className="text-sm text-slate-500 mb-2">{series.series}*</p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md">{series.description}</p>
                    </div>
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-slate-100 group-hover:bg-slate-200 ${isExpanded ? "rotate-180 bg-slate-200" : ""}`}>
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">{t("catalog.exw_price", lang)}</p>
                      <p className="text-2xl font-extrabold text-slate-900">{series.priceRange}</p>
                    </div>
                    <span className="text-xs text-slate-400">{series.variants.length} variant{series.variants.length > 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Expanded Variants */}
                <div className={`grid transition-all duration-300 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="bg-slate-50/50 rounded-b-3xl border border-t-0 border-slate-100 p-4 lg:p-6">
                      {variants.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); toggleSort(series.series) }} className="mb-4 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          Sort by price {sortAsc[series.series] ? "↑" : "↓"}
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {variants.map((variant) => {
                          const key = makeKey(series.series, variant)
                          const isSelected = compareSet.has(key)
                          return (
                            <div key={key} className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                              {/* Compare checkbox */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCompare(series.series, variant) }}
                                className={`absolute top-3 right-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors bg-transparent cursor-pointer ${
                                  isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 hover:border-slate-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div className="mb-3 flex flex-wrap pr-7">
                                {variant.tags.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 mr-1 mb-1">{tag}</span>
                                ))}
                              </div>
                              <h4 className="text-base font-bold text-slate-900 mb-1">{variant.name}</h4>
                              <p className="text-xs text-slate-500 mb-4">{variant.model}</p>
                              <div className="pt-3 border-t border-slate-200/60">
                                <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">{t("catalog.exw_price", lang)}</p>
                                <p className="text-xl font-extrabold text-slate-900">{variant.price}</p>
                              </div>
                              {Object.keys(variant.specs || {}).length > 0 && (
                                <details className="group mt-3 w-full">
                                  <summary className="w-full py-2 text-xs font-medium rounded-xl cursor-pointer border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 list-none text-center [&::-webkit-details-marker]:hidden">
                                    View Specifications
                                  </summary>
                                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                    {Object.entries(variant.specs || {}).map(([key, val]) => (
                                      <div key={key} className="flex justify-between items-start gap-2">
                                        <span className="text-[11px] text-slate-500 leading-relaxed flex-1">{key}</span>
                                        <span className="text-[11px] font-medium text-slate-800 text-right leading-relaxed max-w-[50%]">{val}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comparison Modal */}
      {showCompare && compareData.length >= 2 && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCompare(false)}>
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 lg:p-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Compare Products</h3>
              <button onClick={() => setShowCompare(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0 cursor-pointer border-none">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200 sticky left-0 bg-white min-w-[120px]">Specification</th>
                    {compareData.map((d, i) => (
                      <th key={i} className="text-center py-3 px-3 text-sm font-bold text-slate-900 border-b border-slate-200 min-w-[140px]">
                        <div className="text-xs text-slate-500 font-normal mt-0.5">{d.seriesName}</div>
                        <div>{d.variant.model}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Price row */}
                  <tr className="bg-blue-50/40">
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-600 border-b border-slate-100 sticky left-0 bg-blue-50/40">Price</td>
                    {compareData.map((d, i) => (
                      <td key={i} className="text-center py-3 px-3 text-sm font-bold text-blue-700 border-b border-slate-100">{d.variant.price}</td>
                    ))}
                  </tr>
                  {/* Spec rows */}
                  {allSpecNames.map((specName) => (
                    <tr key={specName}>
                      <td className="py-2.5 pr-4 text-xs text-slate-500 border-b border-slate-50 sticky left-0 bg-white">{specName}</td>
                      {compareData.map((d, i) => {
                        const val = d.variant.specs?.[specName] || "-"
                        return (
                          <td key={i} className={`text-center py-2.5 px-3 text-xs border-b border-slate-50 ${val === "-" ? "text-slate-300" : "text-slate-700"}`}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* No specs message */}
                  {allSpecNames.length === 0 && (
                    <tr>
                      <td colSpan={compareData.length + 1} className="text-center py-8 text-sm text-slate-400">
                        No specification data available for selected products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowCompare(false)}
              className="mt-6 w-full py-3 text-sm font-medium text-white rounded-2xl border-none cursor-pointer transition-all"
              style={{ backgroundColor: "#1d1d1f" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
