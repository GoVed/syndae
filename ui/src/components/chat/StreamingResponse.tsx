import React, { useState } from 'react';
import { Bot, BrainCircuit, ChevronDown, ChevronRight, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { ToolExecutionCard } from './types';
import { extractThoughtAndContent, extractOptionsAndContent, renderMarkdown } from './helpers';

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
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const toggleToolExpand = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const liveParsed = extractThoughtAndContent(liveStreamingText, liveThought);
  const activeThought = liveParsed.thought || liveThought;
  const { content: activeStreamingText } = extractOptionsAndContent(liveParsed.content);

  return (
    <div className="flex flex-col items-start space-y-2.5 w-full">
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

      {/* Collapsible Live Thought Bubble */}
      {activeThought && (
        <div className="w-full max-w-3xl rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs p-3 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-purple-800/60">
          <button
            type="button"
            onClick={() => setThoughtExpanded(!thoughtExpanded)}
            className="flex items-center justify-between w-full text-left text-purple-300 text-xs font-semibold select-none hover:text-purple-200 transition-colors py-0.5 px-1 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <BrainCircuit className="w-4 h-4 text-purple-400 animate-spin" />
              <span>Thinking & Analyzing...</span>
              <span className="text-[11px] text-purple-400/60 font-normal">
                {thoughtExpanded ? '(click to collapse)' : '(click to view details)'}
              </span>
            </div>
            {thoughtExpanded ? <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> : <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
          </button>
          {thoughtExpanded && (
            <div className="whitespace-pre-wrap text-purple-200/90 leading-relaxed max-h-48 overflow-y-auto pt-2.5 mt-2 border-t border-purple-900/30 text-xs bg-syndae-950/80 p-2.5 rounded-lg font-mono">
              {activeThought}
            </div>
          )}
        </div>
      )}

      {/* Live Tool Execution Cards */}
      {liveToolExecutions.map(exec => {
        const isExpanded = expandedTools[exec.id] ?? true;
        return (
          <div
            key={exec.id}
            className="w-full max-w-3xl rounded-xl border border-syndae-700/80 bg-syndae-900/90 text-xs overflow-hidden shadow-md backdrop-blur-md transition-all duration-200"
          >
            <div
              onClick={() => toggleToolExpand(exec.id)}
              className="p-2.5 px-3.5 bg-syndae-850/90 flex items-center justify-between cursor-pointer border-b border-syndae-800/80 hover:bg-syndae-800/90 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-slate-200">TOOL:</span>
                <span className="text-cyan-300 font-semibold">{exec.tool_name}</span>
                {exec.status === 'running' && (
                  <span className="text-amber-300 animate-pulse text-[10px] font-medium bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">[EXECUTING...]</span>
                )}
                {exec.status === 'completed' && (
                  <span className="text-emerald-300 text-[10px] font-medium bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>COMPLETED</span>
                  </span>
                )}
                {exec.status === 'rejected' && (
                  <span className="text-rose-300 text-[10px] font-medium bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>REJECTED</span>
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            {isExpanded && (
              <div className="p-3.5 space-y-2.5 bg-syndae-950/90">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Parameters:</div>
                  <pre className="bg-syndae-900 p-2.5 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto border border-syndae-800">
                    {JSON.stringify(exec.arguments, null, 2)}
                  </pre>
                </div>
                {exec.output && (
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Output:</div>
                    <pre className="bg-syndae-900 p-2.5 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-40 border border-syndae-800">
                      {exec.output}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

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
