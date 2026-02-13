'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_CHARS = 2000

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  initialValue?: string
}

export function ChatInput({ onSend, disabled, placeholder, initialValue }: ChatInputProps) {
  const [message, setMessage] = useState(initialValue ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = message.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setMessage('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_CHARS) {
      setMessage(value)
    }

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  }

  const charCount = message.length
  const isNearLimit = charCount > MAX_CHARS * 0.9
  const isOverLimit = charCount >= MAX_CHARS

  return (
    <div className="border-t border-stone-200 bg-white p-4">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder ?? 'Ask your tutor a question...'}
            rows={1}
            className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 pr-16 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {/* Character count */}
          {isNearLimit && (
            <span
              className={`absolute bottom-2 right-3 text-[10px] ${
                isOverLimit ? 'text-rose-500' : 'text-stone-400'
              }`}
            >
              {charCount}/{MAX_CHARS}
            </span>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || message.trim().length === 0}
          size="icon"
          className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-11 w-11"
        >
          <Send className="size-4" />
        </Button>
      </div>
      <p className="text-[10px] text-stone-400 mt-1.5 px-1">
        Press Enter to send, Shift+Enter for a new line
      </p>
    </div>
  )
}
