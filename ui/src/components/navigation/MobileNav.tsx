import React from 'react';
import { MessageSquare, Settings } from 'lucide-react';
import { ApprovalTicket } from '../../types';

export interface MobileNavProps {
  activeTab: 'chat' | 'settings' | 'models' | 'memory' | 'tools';
  pendingTickets: ApprovalTicket[];
  onSelectTab: (tab: 'chat' | 'settings' | 'models' | 'memory' | 'tools') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  pendingTickets,
  onSelectTab,
}) => {
  return (
    <div className="md:hidden flex-shrink-0 bg-syndae-900/95 backdrop-blur-2xl border-t border-syndae-800/80 px-6 py-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] flex items-center justify-around z-30 shadow-lg">
      <button
        type="button"
        onClick={() => onSelectTab('chat')}
        className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-95 ${
          activeTab === 'chat'
            ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 font-semibold shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {pendingTickets.length > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-600 text-white rounded-full px-1.5 text-[9px] font-bold animate-pulse shadow-sm">
              {pendingTickets.length}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-1 font-medium">Chat</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('settings')}
        className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-95 ${
          activeTab === 'settings' || activeTab === 'models' || activeTab === 'memory' || activeTab === 'tools'
            ? 'text-violet-300 bg-violet-950/40 border border-violet-500/30 font-semibold shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium">Settings</span>
      </button>
    </div>
  );
};
