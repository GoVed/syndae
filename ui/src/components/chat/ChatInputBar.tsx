import React from 'react';
import { Send, AlertTriangle } from 'lucide-react';

export interface ChatInputBarProps {
  inputPrompt: string;
  isStreaming: boolean;
  mode: 'chat' | 'mission';
  chatError?: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChangePrompt: (val: string) => void;
  onSend: () => void;
  onClearChatError?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputPrompt,
  isStreaming,
  mode,
  chatError,
  textareaRef,
  onChangePrompt,
  onSend,
  onClearChatError,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 md:pb-4 border-t border-syndae-800/80 bg-syndae-900 font-sans flex-shrink-0 space-y-2">
      {chatError && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/60 to-syndae-900/80 border border-rose-800/60 text-rose-200 text-xs shadow-lg backdrop-blur-md flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-rose-300 flex items-center justify-between">
              <span>Inference Engine Notice</span>
              {onClearChatError && (
                <button
                  type="button"
                  onClick={onClearChatError}
                  className="text-slate-400 hover:text-slate-200 text-[10px] uppercase font-semibold transition-colors px-1.5 py-0.5 rounded hover:bg-rose-900/40"
                >
                  Dismiss [✕]
                </button>
              )}
            </div>
            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{chatError}</div>
          </div>
        </div>
      )}

      <div className="relative flex items-end bg-syndae-950/90 border border-syndae-700/80 hover:border-syndae-600/80 rounded-2xl p-1.5 pl-3.5 shadow-md shadow-black/25 focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
        <textarea
          ref={textareaRef}
          rows={2}
          value={inputPrompt}
          onChange={e => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={
            mode === 'mission'
              ? 'Define autonomous mission goal or project (Syndae will organize steps & assist)...'
              : 'Ask me anything, describe a task, or type a message...'
          }
          className="w-full bg-transparent py-2 px-0 text-sm text-slate-100 placeholder:text-slate-400 placeholder:font-normal leading-relaxed resize-none focus:outline-none min-h-[44px] max-h-36"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={isStreaming || !inputPrompt.trim()}
          className={`mb-0.5 mr-0.5 p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 ${
            isStreaming || !inputPrompt.trim()
              ? 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer'
          }`}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="hidden sm:flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>Press Enter to send, Shift+Enter for newline</span>
        <div className="flex items-center space-x-1.5 text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>100% Private • Safe Mode Active</span>
        </div>
      </div>
    </div>
  );
};
