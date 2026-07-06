"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { ErrorBoundary } from "@/components/error-boundary"
import { api } from "@/lib/api"
import {
  Send, Plus, Trash2, MessageSquare, Sparkles,
  Clock, ChevronLeft, ChevronRight, Bot, User,
  AlertCircle,
} from "lucide-react"

interface Conversation {
  id: string
  title: string
  message_count: number
  total_tokens: number
  model: string
  created_at: string | null
  updated_at: string | null
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

function LLMPageInner() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convTotal, setConvTotal] = useState(0)
  const [convId, setConvId] = useState<string>("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null)
  const [error, setError] = useState("")
  const [usage, setUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null)
  const msgsEnd = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.llm.status().then(setStatus).catch(() => setStatus({ enabled: false }))
    loadConversations()
  }, [])

  useEffect(() => {
    msgsEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadConversations() {
    try {
      const res = await api.llm.conversations()
      setConversations(res.conversations)
      setConvTotal(res.total)
    } catch { }
  }

  async function newConversation() {
    setConvId("")
    setMessages([])
    setUsage(null)
    setError("")
    inputRef.current?.focus()
  }

  async function selectConversation(id: string) {
    setConvId(id)
    setMessages([])
    setUsage(null)
    setError("")
    try {
      const all = await api.llm.conversations(100, 0)
      const convs = all.conversations
    } catch { }
    // For now, we reset — messages will load as user continues chatting
  }

  async function deleteConv(id: string) {
    try {
      await api.llm.deleteConversation(id)
      if (convId === id) {
        setConvId("")
        setMessages([])
        setUsage(null)
      }
      loadConversations()
    } catch { }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    setError("")
    setMessages(prev => [...prev, { role: "user", content: text }])
    setSending(true)
    try {
      const res = await api.llm.chat({
        message: text,
        conversation_id: convId || undefined,
      })
      setConvId(res.conversation_id)
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }])
      setUsage(res.usage)
      loadConversations()
    } catch (e: any) {
      setError(e.message || "AI 服务不可用")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-[#f2f2f7] relative">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-[280px]" : "w-0"} transition-all duration-200 bg-white border-r border-gray-100 overflow-hidden flex flex-col shrink-0`}>
          <div className="p-3 border-b border-gray-50">
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#007AFF] hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus size={16} />
              新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(c => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  convId === c.id
                    ? "bg-[#007AFF]/10 text-[#007AFF]"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => selectConversation(c.id)}
              >
                <MessageSquare size={14} className="shrink-0 opacity-50" />
                <span className="truncate flex-1">{c.title}</span>
                <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.message_count}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConv(c.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">暂无对话</p>
            )}
          </div>
        </div>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-3 z-10 w-6 h-6 flex items-center justify-center bg-white border border-gray-100 rounded-r-md shadow-sm text-gray-400 hover:text-gray-600"
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white">
            <Bot size={18} className="text-[#007AFF]" />
            <span className="text-sm font-medium text-gray-800">AI 助手</span>
            {status && !status.enabled && (
              <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                未配置
              </span>
            )}
            {usage && (
              <span className="text-[10px] text-gray-400 ml-auto">
                Tokens: {usage.total_tokens}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Sparkles size={32} className="text-[#007AFF]/30" />
                <p className="text-sm">有什么可以帮你的？</p>
                {!status?.enabled && (
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    请在 .env 文件中设置 LLM_ENABLED=true 和 DEEPSEEK_API_KEY
                  </p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "bg-[#007AFF] text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {msg.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "assistant"
                    ? "bg-white border border-gray-100 text-gray-800"
                    : "bg-[#007AFF] text-white"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#007AFF] text-white flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400">
                  <span className="inline-block animate-pulse">思考中...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 text-red-500 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <AlertCircle size={12} />
                  {error}
                </div>
              </div>
            )}
            <div ref={msgsEnd} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-4 py-3">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 200) + "px"
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#0066CC] transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function LLMPage() {
  return (
    <ErrorBoundary>
      <LLMPageInner />
    </ErrorBoundary>
  )
}
