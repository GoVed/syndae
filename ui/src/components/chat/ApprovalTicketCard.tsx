import React from 'react';
import { ShieldAlert, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { ApprovalTicket } from '../../types';

export interface ApprovalTicketCardProps {
  ticket: ApprovalTicket;
  editingTicket: { id: string; argsStr: string } | null;
  rejectReason: { id: string; text: string } | null;
  onSetEditingTicket: (editing: { id: string; argsStr: string } | null) => void;
  onSetRejectReason: (reason: { id: string; text: string } | null) => void;
  onResolveTicket: (
    ticketId: string,
    action: 'APPROVE' | 'REJECT' | 'MODIFY',
    modifiedArgs?: any,
    reason?: string
  ) => void;
}

export const ApprovalTicketCard: React.FC<ApprovalTicketCardProps> = ({
  ticket,
  editingTicket,
  rejectReason,
  onSetEditingTicket,
  onSetRejectReason,
  onResolveTicket,
}) => {
  return (
    <div
      key={ticket.ticket_id}
      className="w-full max-w-3xl rounded-2xl border border-amber-600/40 bg-zinc-900/95 p-4 sm:p-5 shadow-lg shadow-black/25 space-y-3.5 font-sans text-xs backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center space-x-2.5 text-amber-300 font-bold">
          <div className="p-1 rounded-lg bg-zinc-800 border border-amber-600/40 text-amber-400">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <span className="tracking-wide">DETERMINISTIC GATE: MUTATING ACTION HALTED</span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-amber-300 text-[10px] border border-amber-600/50 font-bold tracking-wider">
          RISK: {ticket.risk_level}
        </span>
      </div>

      <div>
        <p className="text-slate-300 text-xs sm:text-[13px] mb-2 font-sans leading-relaxed">
          The agent requires authorization to execute mutating tool{' '}
          <code className="bg-syndae-950 px-2 py-0.5 rounded-md text-amber-300 font-mono font-semibold border border-amber-500/30">
            {ticket.tool_name}
          </code>
          .
        </p>
        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1 tracking-wider">
          Proposed Arguments:
        </div>
        <pre className="bg-syndae-950/90 p-3 rounded-xl border border-syndae-700/80 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 shadow-inner">
          {JSON.stringify(ticket.arguments, null, 2)}
        </pre>
      </div>

      {/* Parameter Editor Drawer if Edit Arguments is clicked */}
      {editingTicket?.id === ticket.ticket_id && (
        <div className="p-3 rounded-xl bg-syndae-950 border border-cyan-700/60 space-y-2.5 shadow-md animate-fade-in">
          <div className="text-xs text-cyan-300 font-semibold">Edit Tool Arguments (JSON):</div>
          <textarea
            rows={5}
            value={editingTicket.argsStr}
            onChange={e =>
              onSetEditingTicket({ id: ticket.ticket_id, argsStr: e.target.value })
            }
            className="w-full bg-syndae-900 border border-syndae-700 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => onSetEditingTicket(null)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(editingTicket.argsStr);
                  onResolveTicket(ticket.ticket_id, 'MODIFY', parsed);
                  onSetEditingTicket(null);
                } catch (err) {
                  alert('Invalid JSON: ' + err);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Apply & Approve
            </button>
          </div>
        </div>
      )}

      {/* Rejection reason prompt */}
      {rejectReason?.id === ticket.ticket_id && (
        <div className="p-3 rounded-xl bg-syndae-950 border border-rose-700/60 space-y-2.5 shadow-md animate-fade-in">
          <div className="text-xs text-rose-300 font-semibold">Rejection Reason for Agent:</div>
          <input
            type="text"
            value={rejectReason.text}
            onChange={e =>
              onSetRejectReason({ id: ticket.ticket_id, text: e.target.value })
            }
            placeholder="e.g. Unsafe target path, execute alternative plan"
            className="w-full bg-syndae-900 border border-syndae-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => onSetRejectReason(null)}
              className="px-3 py-1.5 rounded-lg text-slate-400 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onResolveTicket(ticket.ticket_id, 'REJECT', undefined, rejectReason.text);
                onSetRejectReason(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Confirm Reject
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => onResolveTicket(ticket.ticket_id, 'APPROVE')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <CheckCircle className="w-4 h-4 text-white" />
          <span>Approve & Continue</span>
        </button>
        <button
          type="button"
          onClick={() =>
            onSetRejectReason({
              id: ticket.ticket_id,
              text: 'Operator rejected execution.',
            })
          }
          className="px-4 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-semibold text-xs flex items-center space-x-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <XCircle className="w-4 h-4 text-rose-400" />
          <span>Reject Execution</span>
        </button>
        <button
          type="button"
          onClick={() =>
            onSetEditingTicket({
              id: ticket.ticket_id,
              argsStr: JSON.stringify(ticket.arguments, null, 2),
            })
          }
          className="px-4 py-2 rounded-xl bg-syndae-800 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 font-semibold text-xs flex items-center space-x-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-cyan-400" />
          <span>Edit Arguments</span>
        </button>
      </div>
    </div>
  );
};
