import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, company, phone, country, interest, message } = body

    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Name and email are required" }, { status: 400 })
    }

    // Store to Vercel KV or log for now
    console.log("[INQUIRY]", { name, email, company, phone, country, interest, message })

    return NextResponse.json({
      success: true,
      message: "Inquiry received. We will contact you soon.",
      lead_id: crypto.randomUUID(),
    })
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
