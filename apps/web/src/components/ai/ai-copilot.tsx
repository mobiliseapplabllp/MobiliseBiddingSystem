'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Loader2, Bot, User } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AICopilotProps {
  /** Current page context */
  context?: { page?: string; entityId?: string; entityType?: string };
}

export function AICopilot({ context }: AICopilotProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await api.post<{ aiEnabled: boolean; response?: string; message?: string }>(
        '/ai/chat',
        { message: userMsg.content, context },
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response ?? result.message ?? t('aiUnavailable', 'AI is not available right now.'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('aiError', 'Sorry, something went wrong. Please try again.'),
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 end-6 h-12 w-12 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-all hover:scale-105 flex items-center justify-center z-50"
        aria-label={t('aiCopilot', 'AI Copilot')}
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 end-6 w-[380px] h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-violet-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{t('procurementCopilot', 'Procurement Copilot')}</p>
            <p className="text-[10px] text-gray-500">{t('aiPowered', 'AI-powered assistant')}</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-violet-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">{t('copilotWelcome', 'How can I help with your procurement?')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('copilotHint', 'Ask about auction types, evaluation methods, or procurement best practices.')}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3 w-3 text-violet-600" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-be-sm'
                : 'bg-gray-100 text-gray-800 rounded-bs-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3 w-3 text-blue-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <Loader2 className="h-3 w-3 text-violet-600 animate-spin" />
            </div>
            <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bs-sm text-[13px] text-gray-500">
              {t('aiThinking', 'Thinking...')}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('copilotPlaceholder', 'Ask a procurement question...')}
            className="flex-1 h-[38px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-[38px] w-[38px] rounded-lg bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
