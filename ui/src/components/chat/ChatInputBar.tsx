import React, { useRef, useState } from 'react';
import { Send, AlertTriangle, Image as ImageIcon, Plus, X } from 'lucide-react';

export interface ChatInputBarProps {
  inputPrompt: string;
  isStreaming: boolean;
  mode: 'chat' | 'mission';
  chatError?: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChangePrompt: (val: string) => void;
  onSend: (images?: string[]) => void;
  onClearChatError?: () => void;
  attachedImages?: string[];
  onAddImages?: (imgs: string[]) => void;
  onRemoveImage?: (index: number) => void;
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
  attachedImages = [],
  onAddImages,
  onRemoveImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canSend = !isStreaming && (inputPrompt.trim().length > 0 || attachedImages.length > 0);

  const handleSend = () => {
    if (!canSend) return;
    onSend(attachedImages.length > 0 ? attachedImages : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processImageFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onAddImages?.([reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      processImageFiles(imageFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processImageFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 md:pb-4 border-t border-syndae-800/80 bg-syndae-900 font-sans flex-shrink-0 space-y-2 transition-colors ${
        isDragging ? 'bg-emerald-950/20 border-emerald-500/50' : ''
      }`}
    >
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

      {/* Hidden file input for native file dialog */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Attached Images Preview Strip */}
      {attachedImages.length > 0 && (
        <div className="flex items-center gap-2 px-1 py-1.5 overflow-x-auto max-w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
          {attachedImages.map((imgSrc, idx) => (
            <div
              key={idx}
              className="relative group w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/50 shadow-md shrink-0 bg-syndae-950/90"
            >
              <img
                src={imgSrc}
                alt={`Attachment ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage?.(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-rose-600 transition-colors shadow-sm"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-xl border border-dashed border-syndae-700 hover:border-emerald-500/60 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 bg-syndae-950/40 hover:bg-emerald-950/20 transition-all shrink-0 cursor-pointer text-[10px] gap-1"
            title="Attach more images"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      )}

      <div
        className={`relative flex items-end bg-syndae-950/90 border rounded-2xl p-1.5 pl-2 sm:pl-3 shadow-md shadow-black/25 transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : 'border-syndae-700/80 hover:border-syndae-600/80 focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20'
        }`}
      >
        {/* Attach Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="mb-1 p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-syndae-850 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach image (or drag & drop / paste)"
        >
          <ImageIcon className="w-4.5 h-4.5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={2}
          value={inputPrompt}
          onChange={e => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isStreaming}
          placeholder={
            attachedImages.length > 0
              ? 'Add a question or instruction for the attached image(s)...'
              : mode === 'mission'
              ? 'Define autonomous mission goal or project (Syndae will organize steps & assist)...'
              : 'Ask me anything, attach an image, describe a task, or type a message...'
          }
          className="w-full bg-transparent py-2 px-2 text-sm text-slate-100 placeholder:text-slate-400 placeholder:font-normal leading-relaxed resize-none focus:outline-none min-h-[44px] max-h-36"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`mb-0.5 mr-0.5 p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 ${
            !canSend
              ? 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed opacity-50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer'
          }`}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="hidden sm:flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>Press Enter to send, Shift+Enter for newline • Paste or drop images directly</span>
        <div className="flex items-center space-x-1.5 text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Multimodal Vision Ready</span>
        </div>
      </div>
    </div>
  );
};

