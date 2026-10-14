import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ToolExecutionCard } from './types';
import { extractThoughtAndContent, extractOptionsAndContent, renderMarkdown } from './helpers';
import { AggregatedToolActivity } from './AggregatedToolActivity';

export interface StreamingResponseProps {
  liveStreamingText: string;
  liveThought: string;
  liveToolExecutions: ToolExecutionCard[];
  isGeneratingOptions?: boolean;
}

export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  liveStreamingText,
  liveThought,
  liveToolExecutions,
  isGeneratingOptions = false,
}) => {
  const [thoughtExpanded, setThoughtExpanded] = useState(false);

  const liveParsed = extractThoughtAndContent(liveStreamingText, liveThought);
  const activeThought = liveParsed.thought || liveThought;
  const { content: activeStreamingText } = extractOptionsAndContent(liveParsed.content);

  return (
    <div className="flex flex-col items-start space-y-2.5 w-full">
      {/* Bot Header Badge */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
        <div className={`p-1 rounded-md border ${
          isGeneratingOptions
            ? 'bg-amber-950/80 border-amber-500/30 text-amber-400'
            : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
        }`}>
          <Bot className="w-3.5 h-3.5" />
        </div>
        <span className="text-slate-100 font-semibold">Syndae</span>
        {isGeneratingOptions ? (
          <span className="flex items-center space-x-1.5 text-[10px] text-amber-300 bg-amber-950/70 border border-amber-500/30 rounded-full px-2.5 py-0.5 font-medium animate-fade-in">
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="options-shimmer-text font-semibold">Suggesting next actions...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1.5 text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Generating response...</span>
          </span>
        )}
      </div>

      {/* Persisted & Active Execution Timeline */}
      {liveToolExecutions.length > 0 && (
        <AggregatedToolActivity executions={liveToolExecutions} />
      )}

      {/* Smooth Thinking & Reasoning Bubble for active step */}
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
            <div className="whitespace-pre-wrap text-purple-200/90 leading-relaxed max-h-48 overflow-y-auto pt-2.5 mt-2 border-t border-purple-900/30 text-xs bg-syndae-950/80 p-2.5 rounded-lg font-mono select-text">
              {activeThought}
            </div>
          )}
        </div>
      )}

      {/* Streaming Content */}
      {activeStreamingText && (
        <div className="max-w-3xl rounded-2xl rounded-tl-sm p-4 sm:p-4.5 bg-syndae-900/90 text-slate-200 border border-syndae-800/80 text-[13.5px] leading-relaxed shadow-lg shadow-black/20 backdrop-blur-md select-text">
          <div
            className="prose max-w-none break-words select-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(activeStreamingText) }}
          />
        </div>
      )}

      {/* Shimmering Suggested Options Skeleton while post-turn subagent runs */}
      {isGeneratingOptions && (
        <div className="w-full max-w-3xl rounded-2xl bg-syndae-900/90 border border-amber-500/30 p-3.5 space-y-3 shadow-md backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center space-x-1.5 font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="options-shimmer-text">SUGGESTING NEXT ACTIONS...</span>
            </span>
            <span className="text-[11px] text-amber-400/80 font-medium px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/30">
              Generating options
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5 pt-0.5">
            <div className="h-8 w-36 rounded-xl options-shimmer-pill border border-amber-500/20" />
            <div className="h-8 w-48 rounded-xl options-shimmer-pill border border-amber-500/20" />
            <div className="h-8 w-32 rounded-xl options-shimmer-pill border border-amber-500/20" />
            <div className="h-8 w-24 rounded-xl options-shimmer-pill border border-amber-500/20" />
          </div>
        </div>
      )}
    </div>
  );
};
