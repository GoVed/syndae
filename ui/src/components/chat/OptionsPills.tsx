import React from 'react';
import { Sparkles, Edit3, Send } from 'lucide-react';
import { InteractiveOption } from './types';

export interface OptionsPillsProps {
  messageId: string;
  options: InteractiveOption[];
  hasUserReplied: boolean;
  isStreaming: boolean;
  activeOtherMsgId: string | null;
  otherInputText: string;
  nextMessageContent?: string;
  onSendOption: (optionLabel: string) => void;
  onToggleOther: (msgId: string) => void;
  onChangeOtherText: (text: string) => void;
  onSubmitOther: (text: string) => void;
}

export const OptionsPills: React.FC<OptionsPillsProps> = ({
  messageId,
  options,
  hasUserReplied,
  isStreaming,
  activeOtherMsgId,
  otherInputText,
  nextMessageContent,
  onSendOption,
  onToggleOther,
  onChangeOtherText,
  onSubmitOther,
}) => {
  if (options.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mt-3 rounded-2xl bg-syndae-900/90 border border-syndae-800/90 p-3.5 space-y-3 shadow-md backdrop-blur-md animate-fade-in">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center space-x-1.5 font-semibold text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {hasUserReplied ? 'OPTIONS OFFERED:' : 'CHOOSE AN OPTION OR SPECIFY DETAILS:'}
          </span>
        </span>
        {!hasUserReplied && (
          <span className="text-[11px] text-emerald-400 font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30">
            1-click reply
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {options.map(opt => {
          const isSelectedByFollowup =
            hasUserReplied &&
            nextMessageContent
              ?.trim()
              .toLowerCase()
              .includes(opt.label.trim().toLowerCase());

          if (opt.isOther) {
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (hasUserReplied || isStreaming) return;
                  onToggleOther(messageId);
                }}
                disabled={hasUserReplied || isStreaming}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-200 flex items-center space-x-1.5 shadow-sm ${
                  hasUserReplied
                    ? 'bg-syndae-950/40 text-slate-500 border border-syndae-800 cursor-default'
                    : activeOtherMsgId === messageId
                    ? 'bg-purple-900/90 text-purple-100 border border-purple-400 ring-2 ring-purple-500/30'
                    : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 border border-purple-500/40 hover:border-purple-400 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>{opt.label}</span>
              </button>
            );
          }

          return (
            <div
              key={opt.id}
              className={`group inline-flex items-center rounded-xl text-xs sm:text-[13px] transition-all duration-200 shadow-sm ${
                isSelectedByFollowup
                  ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-sm'
                  : hasUserReplied
                  ? 'bg-syndae-950/40 text-slate-500 border border-syndae-800'
                  : 'bg-syndae-850 hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-200 border border-syndae-700/80 hover:border-emerald-500/50 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (hasUserReplied || isStreaming) return;
                  onSendOption(opt.label);
                }}
                disabled={hasUserReplied || isStreaming}
                className={`px-3.5 py-2 font-medium flex items-center space-x-1.5 ${
                  hasUserReplied ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Inline custom prompt when "Other..." pill is activated */}
      {activeOtherMsgId === messageId && !hasUserReplied && (
        <div className="pt-2.5 border-t border-purple-900/40 flex items-center space-x-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            type="text"
            value={otherInputText}
            onChange={e => onChangeOtherText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && otherInputText.trim() && !isStreaming) {
                onSubmitOther(otherInputText.trim());
              }
            }}
            placeholder="Type custom response or details..."
            autoFocus
            className="flex-1 bg-syndae-950 border border-purple-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
          <button
            type="button"
            onClick={() => {
              if (otherInputText.trim() && !isStreaming) {
                onSubmitOther(otherInputText.trim());
              }
            }}
            disabled={!otherInputText.trim() || isStreaming}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
