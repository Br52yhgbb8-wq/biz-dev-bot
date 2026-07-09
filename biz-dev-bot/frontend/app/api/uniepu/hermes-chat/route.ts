import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, session_id } = body

    // Basic inquiry response (full AI integration needs backend deployment)
    const reply = `Thank you for your interest in UNIEPU solar air conditioners.

Here is our catalog with EXW prices:
https://uniepu.tech

For pricing and availability, please contact us at:
📧 shichen@unipu.com
💬 WhatsApp: +86...

Our team will respond within 24 hours.`

    return NextResponse.json({
      reply,
      session_id: session_id || crypto.randomUUID(),
    })
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
