import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
        <p className="text-lg text-slate-500 mb-6">Page not found</p>
        <Link href="/" className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  )
}
