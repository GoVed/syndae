import React, { useState } from 'react';
import { Bot, User, MessageSquare, BrainCircuit, Sparkles, ChevronDown, ChevronRight, CornerDownRight, Maximize2, X, Download } from 'lucide-react';
import { ChatMessage } from '../../types';
import { extractThoughtAndContent, extractOptionsAndContent, parseToolEvent, renderMarkdown } from './helpers';
import { OptionsPills } from './OptionsPills';

export interface MessageItemProps {
  message: ChatMessage;
  nextMessage?: ChatMessage;
  isStreaming: boolean;
  isThoughtOpen: boolean;
  activeOtherMsgId: string | null;
  otherInputText: string;
  onToggleThought: (id: string) => void;
  onSendOption: (option: string) => void;
  onToggleOther: (msgId: string) => void;
  onChangeOtherText: (text: string) => void;
  onSubmitOther: (text: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  nextMessage,
  isStreaming,
  isThoughtOpen,
  activeOtherMsgId,
  otherInputText,
  onToggleThought,
  onSendOption,
  onToggleOther,
  onChangeOtherText,
  onSubmitOther,
}) => {
  const isUser = message.role === 'user';
  const parsedToolEvent = isUser ? parseToolEvent(message.content) : null;
  const isToolEvent = !!parsedToolEvent;

  const { thought, content: cleanThoughtContent } = isUser
    ? { thought: null, content: message.content }
    : extractThoughtAndContent(message.content, message.thought);

  const { content: rawCleanContent, options } = isUser
    ? { content: cleanThoughtContent, options: [] }
    : extractOptionsAndContent(cleanThoughtContent);

  const cleanContent = rawCleanContent || (!isUser && options.length > 0 ? "I've processed your request. Please select a next action below:" : "");

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const resolveImageUrl = (img: string): string => {
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
      return img;
    }
    return `/api/memory/raw?path=${encodeURIComponent(img)}`;
  };

  const parseImages = (imgs?: string | string[] | null): string[] => {
    if (!imgs) return [];
    if (Array.isArray(imgs)) return imgs;
    try {
      const parsed = JSON.parse(imgs);
      return Array.isArray(parsed) ? parsed : [imgs];
    } catch {
      return typeof imgs === 'string' && imgs.trim() ? [imgs] : [];
    }
  };

  const attachedImages = parseImages(message.images);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      const src = (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        setLightboxImage(src);
      }
    }
  };

  const handleImageErrorCapture = (e: React.SyntheticEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName && target.tagName.toLowerCase() === 'img') {
      const box = target.closest('.image-card-box');
      const href = (target as HTMLImageElement).src;
      const alt = (target as HTMLImageElement).alt;
      if (box) {
        box.outerHTML = `<div class="my-2 p-2.5 rounded-xl bg-syndae-900 border border-syndae-800 text-xs text-slate-400 flex items-center justify-between gap-3"><span>⚠️ Image unavailable</span><a href="${href}" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline text-[11px] font-mono truncate max-w-[240px]">${alt && alt !== 'Image preview' && alt !== 'Image' ? alt : href} ↗</a></div>`;
      }
    }
  };

  const isNextMessageToolEvent = !!(
    nextMessage &&
    nextMessage.role === 'user' &&
    parseToolEvent(nextMessage.content)
  );
  const hasUserReplied = !!nextMessage && nextMessage.role === 'user' && !isNextMessageToolEvent;

  return (
    <div className={`flex flex-col w-full max-w-full min-w-0 animate-fade-in ${isUser && !isToolEvent ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center space-x-1.5 mb-1.5 px-1 text-[11px] text-slate-400 font-medium max-w-full overflow-hidden">
        {isToolEvent ? (
          <>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="text-zinc-200 font-semibold truncate">{parsedToolEvent.senderName}</span>
            <span className="text-zinc-500 shrink-0">via</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] shrink-0">
              {parsedToolEvent.protocol}
            </span>
            {parsedToolEvent.isGroup && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[10px] shrink-0">
                Group
              </span>
            )}
            <MessageSquare className="w-3 h-3 text-zinc-400 ml-1 shrink-0" />
          </>
        ) : isUser ? (
          <div className="flex items-center space-x-1.5">
            <span className="text-blue-300 font-semibold">You</span>
            <User className="w-3.5 h-3.5 text-blue-400" />
          </div>
        ) : (
          <div className="flex items-center space-x-1.5">
            <div className="p-1 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-100">Syndae</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 rounded-full px-2 py-0.2 font-semibold">AI</span>
          </div>
        )}
      </div>

      {/* Collapsible Thought / Reasoning Trace Block */}
      {thought && (
        <details className="w-full max-w-3xl mb-2.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs p-3 shadow-sm transition-all duration-200 group min-w-0 overflow-hidden hover:border-purple-800/60">
          <summary className="flex items-center justify-between w-full text-left text-purple-300 text-xs font-semibold select-none hover:text-purple-200 transition-colors py-0.5 px-1 cursor-pointer list-none">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-medium">Reasoning Trace</span>
              <span className="text-[11px] text-purple-400/60 font-normal">
                (click to toggle)
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-purple-400 group-open:rotate-180 transition-transform duration-200" />
          </summary>
          <div className="whitespace-pre-wrap text-purple-200/90 leading-relaxed max-h-56 overflow-y-auto pt-2.5 mt-2 border-t border-purple-900/30 text-xs break-words bg-syndae-950/80 p-2.5 rounded-lg font-mono">
            {thought}
          </div>
        </details>
      )}

      {/* Message Content */}
      {isToolEvent ? (
        <div className="w-full max-w-full sm:max-w-3xl rounded-2xl p-4 text-xs leading-relaxed bg-gradient-to-r from-emerald-950/40 via-syndae-900 to-syndae-900 border border-emerald-500/35 shadow-md space-y-2.5 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 border-b border-emerald-900/40 pb-1.5 gap-2">
            <span className="font-semibold flex items-center space-x-1 shrink-0">
              <span>Incoming {parsedToolEvent.protocol} Message</span>
            </span>
            <span className="text-slate-400 text-[10px] truncate max-w-[200px] text-right">{parsedToolEvent.channel}</span>
          </div>
          {parsedToolEvent.replyTo && (
            <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded bg-emerald-950/40 border-l-2 border-emerald-400 text-[11px] text-slate-200 font-sans break-words">
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-emerald-400 font-mono text-[10px] mr-1.5 font-semibold">Replying to:</span>
                <span className="text-slate-200 italic">{parsedToolEvent.replyTo}</span>
              </div>
            </div>
          )}
          <div className="text-slate-100 text-sm font-sans font-medium px-0.5 leading-normal break-words">
            "{parsedToolEvent.messageText}"
          </div>
          {parsedToolEvent.rawContent && (
            <details className="text-[11px] text-slate-400 font-mono pt-1">
              <summary className="cursor-pointer hover:text-slate-200 select-none">
                Technical event details
              </summary>
              <div className="mt-1.5 p-2 rounded bg-syndae-950/80 border border-slate-800 text-[10px] text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto overflow-x-auto break-all">
                {parsedToolEvent.rawContent}
              </div>
            </details>
          )}
        </div>
      ) : (cleanContent || attachedImages.length > 0) && (
        <div
          onClick={handleContentClick}
          className={`max-w-[88%] sm:max-w-3xl rounded-2xl p-4 sm:p-4.5 text-[13.5px] leading-relaxed min-w-0 overflow-hidden break-words shadow-sm transition-all ${
            isUser
              ? 'bg-blue-950/35 text-blue-50 border border-blue-800/40 rounded-tr-sm'
              : 'bg-syndae-900/90 text-slate-100 border border-syndae-800/80 rounded-tl-sm backdrop-blur-md'
          }`}
        >
          {attachedImages.length > 0 && (
            <div
              className={`mb-3 grid gap-2.5 ${
                attachedImages.length === 1
                  ? 'grid-cols-1 max-w-md'
                  : attachedImages.length === 2
                  ? 'grid-cols-2 max-w-lg'
                  : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {attachedImages.map((img, idx) => {
                const resolvedUrl = resolveImageUrl(img);
                return (
                  <div
                    key={idx}
                    onClick={() => setLightboxImage(resolvedUrl)}
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-emerald-500/50 bg-black/40 transition-all shadow-md hover:scale-[1.01]"
                  >
                    <img
                      src={resolvedUrl}
                      alt={`Attached image ${idx + 1}`}
                      className="w-full max-h-72 object-cover rounded-xl"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                      <Maximize2 className="w-4 h-4" />
                      <span>View</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cleanContent && (
            <div
              className="prose max-w-none break-words min-w-0 overflow-hidden"
              onErrorCapture={handleImageErrorCapture}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanContent) }}
            />
          )}
        </div>
      )}

      {/* Interactive Options Pills */}
      {!isUser && options.length > 0 && (
        <OptionsPills
          messageId={message.id}
          options={options}
          hasUserReplied={hasUserReplied}
          isStreaming={isStreaming}
          activeOtherMsgId={activeOtherMsgId}
          otherInputText={otherInputText}
          nextMessageContent={nextMessage?.content}
          onSendOption={onSendOption}
          onToggleOther={onToggleOther}
          onChangeOtherText={onChangeOtherText}
          onSubmitOther={onSubmitOther}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none cursor-zoom-out"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center cursor-default"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] rounded-2xl border border-white/15 shadow-2xl object-contain"
            />
            <div className="mt-2.5 flex items-center gap-2">
              <a
                href={lightboxImage}
                download="syndae-image"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
