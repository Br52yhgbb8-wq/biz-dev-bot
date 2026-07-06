"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">页面出错了</h3>
          <p className="text-sm text-[#86868b] max-w-sm mb-5">
            {this.state.error?.message || "发生了意外错误，请尝试刷新页面"}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]"
          >
            <RefreshCw className="w-4 h-4" /> 重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
