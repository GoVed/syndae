import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ToolExecutionCard } from './types';
import { extractThoughtAndContent, extractOptionsAndContent, renderMarkdown } from './helpers';
import { AggregatedToolActivity } from './AggregatedToolActivity';

export interface StreamingResponseProps {
  liveStreamingText: string;
  liveThought: string;
  liveToolExecutions: ToolExecutionCard[];
}

export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  liveStreamingText,
  liveThought,
  liveToolExecutions,
}) => {
  const [thoughtExpanded, setThoughtExpanded] = useState(false);

  const liveParsed = extractThoughtAndContent(liveStreamingText, liveThought);
  const activeThought = liveParsed.thought || liveThought;
  const { content: activeStreamingText } = extractOptionsAndContent(liveParsed.content);

  return (
    <div className="flex flex-col items-start space-y-2.5 w-full">
      {/* Bot Header Badge */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
        <div className="p-1 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <span className="text-slate-100 font-semibold">Syndae</span>
        <span className="flex items-center space-x-1.5 text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Generating response...</span>
        </span>
      </div>

      {/* Smooth Thinking & Reasoning Bubble */}
      {activeThought && (
        <div className="w-full max-w-3xl rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs p-3 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-purple-800/60">
          <button
            type="button"
            onClick={() => setThoughtExpanded(!thoughtExpanded)}
            className="flex items-center justify-between w-full text-left text-purple-300 text-xs font-semibold select-none hover:text-purple-200 transition-colors py-0.5 px-1 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                <div className="absolute inset-0 rounded-full bg-purple-500/25 thinking-glow-aura" />
                <Sparkles className="w-3.5 h-3.5 text-purple-300 thinking-glow-icon relative z-10" />
              </div>
              <span className="thinking-shimmer-text font-semibold">Thinking</span>
              <span className="flex items-center space-x-1 ml-0.5">
                <span className="w-1 h-1 rounded-full bg-purple-400 thinking-dot-1" />
                <span className="w-1 h-1 rounded-full bg-purple-400 thinking-dot-2" />
                <span className="w-1 h-1 rounded-full bg-purple-400 thinking-dot-3" />
              </span>
              <span className="text-[11px] text-purple-400/60 font-normal ml-1">
                {thoughtExpanded ? '(click to collapse)' : '(click to view details)'}
              </span>
            </div>
            {thoughtExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 transition-transform" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 transition-transform" />
            )}
          </button>
          {thoughtExpanded && (
            <div className="whitespace-pre-wrap text-purple-200/90 leading-relaxed max-h-48 overflow-y-auto pt-2.5 mt-2 border-t border-purple-900/30 text-xs bg-syndae-950/80 p-2.5 rounded-lg font-mono">
              {activeThought}
            </div>
          )}
        </div>
      )}

      {/* Aggregated Tool Activity (Single Sleek Bar for Users, Expandable for Details) */}
      {liveToolExecutions.length > 0 && (
        <AggregatedToolActivity executions={liveToolExecutions} />
      )}

      {/* Streaming Content */}
      {activeStreamingText && (
        <div className="max-w-3xl rounded-2xl rounded-tl-sm p-4 sm:p-4.5 bg-syndae-900/90 text-slate-200 border border-syndae-800/80 text-[13.5px] leading-relaxed shadow-lg shadow-black/20 backdrop-blur-md">
          <div
            className="prose max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(activeStreamingText) }}
          />
        </div>
      )}
    </div>
  );
};
