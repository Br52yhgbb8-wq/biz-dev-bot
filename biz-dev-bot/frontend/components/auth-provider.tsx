"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AuthState, getStoredAuth, clearAuth, login as apiLogin, register as apiRegister } from "@/lib/auth"

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, username: null, isAuthenticated: false })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setState(getStoredAuth())
    setLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password)
    setState({ token: res.access_token, username, isAuthenticated: true })
    router.push("/dashboard")
  }, [router])

  const register = useCallback(async (username: string, password: string) => {
    const res = await apiRegister(username, password)
    setState({ token: res.access_token, username, isAuthenticated: true })
    router.push("/dashboard")
  }, [router])

  const logout = useCallback(() => {
    clearAuth()
    setState({ token: null, username: null, isAuthenticated: false })
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, loading }}>
      {loading ? null : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
