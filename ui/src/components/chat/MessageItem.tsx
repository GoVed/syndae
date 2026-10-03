import React from 'react';
import { Bot, User, MessageSquare, BrainCircuit, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
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

  const { content: cleanContent, options } = isUser
    ? { content: cleanThoughtContent, options: [] }
    : extractOptionsAndContent(cleanThoughtContent);

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
        <details open className="w-full max-w-3xl mb-2.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs p-3 shadow-sm transition-all duration-200 group min-w-0 overflow-hidden hover:border-purple-800/60">
          <summary className="flex items-center justify-between w-full text-left text-purple-300 text-xs font-semibold select-none hover:text-purple-200 transition-colors py-0.5 px-1 cursor-pointer list-none">
            <div className="flex items-center space-x-2">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Reasoning Trace</span>
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
      ) : cleanContent && (
        <div
          className={`max-w-[88%] sm:max-w-3xl rounded-2xl p-4 sm:p-4.5 text-[13.5px] leading-relaxed min-w-0 overflow-hidden break-words shadow-sm transition-all ${
            isUser
              ? 'bg-blue-950/35 text-blue-50 border border-blue-800/40 rounded-tr-sm'
              : 'bg-syndae-900/90 text-slate-100 border border-syndae-800/80 rounded-tl-sm backdrop-blur-md'
          }`}
        >
          <div
            className="prose max-w-none break-words min-w-0 overflow-hidden"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanContent) }}
          />
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
    </div>
  );
};
