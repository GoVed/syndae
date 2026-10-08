import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Code2,
  Loader2,
} from 'lucide-react';
import { ToolExecutionCard } from './types';
import { formatToolActivity, FormattedToolInfo } from './toolFormatter';

export { formatToolActivity };
export type { FormattedToolInfo };

export interface AggregatedToolActivityProps {
  executions: ToolExecutionCard[];
  defaultExpanded?: boolean;
}

export const AggregatedToolActivity: React.FC<AggregatedToolActivityProps> = ({
  executions,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [openRawParams, setOpenRawParams] = useState<Record<string, boolean>>({});

  if (!executions || executions.length === 0) {
    return null;
  }

  const toggleRawParams = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenRawParams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const runningExec = executions.find(
    e => e.status === 'running' || e.status === 'pending_approval'
  );
  const completedCount = executions.filter(e => e.status === 'completed').length;
  const rejectedCount = executions.filter(e => e.status === 'rejected').length;
  const isAllDone = !runningExec && completedCount + rejectedCount === executions.length;

  // Compute summary line for collapsed view
  let headerTitle = '';

  if (runningExec) {
    const info = formatToolActivity(runningExec.tool_name, runningExec.arguments);
    const stepLabel = runningExec.step ? `Step ${runningExec.step}: ` : '';
    headerTitle = `${stepLabel}${info.actionDescription}`;
  } else if (isAllDone) {
    if (executions.length === 1) {
      const info = formatToolActivity(executions[0].tool_name, executions[0].arguments);
      headerTitle = `Completed ${info.friendlyName}`;
    } else {
      const uniqueNames = Array.from(
        new Set(executions.map(e => formatToolActivity(e.tool_name, e.arguments).friendlyName))
      );
      headerTitle = `Completed ${executions.length} actions (${uniqueNames.join(', ')})`;
    }
  } else {
    headerTitle = `Actions in progress (${completedCount}/${executions.length} completed)`;
  }

  return (
    <div className="w-full max-w-3xl rounded-xl border border-syndae-750/70 bg-syndae-900/85 backdrop-blur-md shadow-sm transition-all duration-200 hover:border-syndae-700 overflow-hidden">
      {/* Aggregated Single Header (Visible to all users) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left select-none cursor-pointer group bg-syndae-850/60 hover:bg-syndae-800/60 transition-colors"
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
          {/* Animated Status Indicator */}
          <div className="relative flex items-center justify-center w-6 h-6 shrink-0 rounded-lg bg-syndae-950 border border-white/5">
            {runningExec ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 smooth-spin-ring" />
                <span className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
              </>
            ) : rejectedCount > 0 ? (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>

          {/* Current Human Description */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-200 truncate">
              {headerTitle}
            </span>
            {executions.length > 1 && runningExec && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 shrink-0">
                {completedCount + 1}/{executions.length}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Control */}
        <div className="flex items-center space-x-1.5 shrink-0 text-slate-400 group-hover:text-slate-200 text-xs transition-colors">
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            {isExpanded ? 'Hide timeline' : `View timeline (${executions.length})`}
          </span>
          <span className="text-[11px] text-slate-400 font-normal sm:hidden">
            {isExpanded ? 'Hide' : `${executions.length}`}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expandable Step-by-Step Chronological Timeline */}
      {isExpanded && (
        <div className="border-t border-syndae-800/80 p-3 sm:p-4 space-y-3.5 bg-syndae-950/80">
          <div className="relative pl-3 space-y-4 before:absolute before:left-1 before:top-2.5 before:bottom-2 before:w-0.5 before:bg-syndae-800">
            {executions.map((exec, idx) => {
              const info = formatToolActivity(exec.tool_name, exec.arguments);
              const StepIcon = info.icon;
              const isRawOpen = openRawParams[exec.id] || false;
              const durationText = exec.duration_ms
                ? exec.duration_ms < 1000
                  ? `${exec.duration_ms}ms`
                  : `${(exec.duration_ms / 1000).toFixed(1)}s`
                : null;

              return (
                <div key={exec.id || idx} className="relative pl-4 text-xs">
                  {/* Timeline bullet */}
                  <div className="absolute -left-3.5 top-1 flex items-center justify-center w-5 h-5 rounded-full bg-syndae-900 border border-syndae-750">
                    {exec.status === 'running' ? (
                      <Loader2 className="w-3 h-3 text-cyan-400 smooth-spin-ring" />
                    ) : exec.status === 'pending_approval' ? (
                      <Clock className="w-3 h-3 text-amber-400" />
                    ) : exec.status === 'rejected' ? (
                      <XCircle className="w-3 h-3 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Step Index & Duration */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="font-semibold text-slate-300">
                        Step {exec.step || idx + 1}
                      </span>
                      {durationText && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {durationText}
                        </span>
                      )}
                    </div>

                    {/* Step Reasoning (Thought) */}
                    {exec.thought && (
                      <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-900/40 text-purple-200/90 text-[11px] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-medium text-purple-300 text-[10.5px] mb-1">
                          <Brain className="w-3 h-3 text-purple-400" />
                          <span>Step Reasoning</span>
                        </div>
                        <div className="whitespace-pre-wrap font-sans text-purple-200/80 pl-4.5 break-words">
                          {exec.thought}
                        </div>
                      </div>
                    )}

                    {/* Step Conversational Output / Statement mid-tool use */}
                    {exec.text && (
                      <div className="px-3 py-1.5 rounded-lg bg-syndae-850/80 border border-syndae-750/70 text-slate-200 text-xs leading-relaxed font-sans break-words">
                        {exec.text}
                      </div>
                    )}

                    {/* Tool Action Card */}
                    <div className="p-2.5 rounded-lg bg-syndae-900/90 border border-syndae-800/90 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <StepIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-100 truncate">
                            {info.friendlyName}
                          </span>
                          <code className="text-[10px] font-mono text-slate-500 bg-syndae-950 px-1.5 py-0.5 rounded border border-white/5">
                            {exec.tool_name}
                          </code>
                        </div>

                        {/* Status Tag */}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            exec.status === 'running'
                              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 animate-pulse'
                              : exec.status === 'pending_approval'
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                              : exec.status === 'rejected'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {exec.status === 'running'
                            ? 'In progress'
                            : exec.status === 'pending_approval'
                            ? 'Pending approval'
                            : exec.status === 'rejected'
                            ? 'Rejected'
                            : 'Completed'}
                        </span>
                      </div>

                      {info.summaryDetail && (
                        <p className="text-[11.5px] text-slate-300 break-words pl-5">
                          {info.summaryDetail}
                        </p>
                      )}

                      {/* Collapsible Raw Payload for Debugging */}
                      <div className="pt-1 pl-5">
                        <button
                          type="button"
                          onClick={(e) => toggleRawParams(exec.id, e)}
                          className="inline-flex items-center space-x-1 text-[10.5px] text-slate-400 hover:text-cyan-300 transition-colors select-none"
                        >
                          <Code2 className="w-3 h-3" />
                          <span>{isRawOpen ? 'Hide raw parameters & output' : 'Show raw parameters & output'}</span>
                        </button>

                        {isRawOpen && (
                          <div className="mt-2 space-y-2 font-mono text-[10.5px]">
                            <div>
                              <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                                Parameters
                              </div>
                              <pre className="p-2 rounded bg-syndae-950 border border-syndae-800 text-slate-300 overflow-x-auto max-h-36">
                                {JSON.stringify(exec.arguments, null, 2)}
                              </pre>
                            </div>
                            {exec.output && (
                              <div>
                                <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                                  Output
                                </div>
                                <pre className="p-2 rounded bg-syndae-950 border border-syndae-800 text-emerald-300 overflow-x-auto max-h-36">
                                  {exec.output}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
