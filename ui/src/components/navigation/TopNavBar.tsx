import React, { useState } from 'react';
import { Cpu, MessageSquare, Settings, Activity, User, Lock, Bell } from 'lucide-react';
import { AuthStatus, SystemTelemetry, ApprovalTicket } from '../../types';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationChime,
} from '../../utils/notifications';

export interface TopNavBarProps {
  activeTab: 'chat' | 'settings' | 'models' | 'memory' | 'tools';
  authStatus: AuthStatus | null;
  telemetry: SystemTelemetry | null;
  pendingTickets: ApprovalTicket[];
  showTelemetryStrip: boolean;
  onSelectTab: (tab: 'chat' | 'settings' | 'models' | 'memory' | 'tools') => void;
  onToggleTelemetryStrip: () => void;
  onLock: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  authStatus,
  telemetry,
  pendingTickets,
  showTelemetryStrip,
  onSelectTab,
  onToggleTelemetryStrip,
  onLock,
}) => {
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getNotificationPermission());

  const handleToggleNotifications = async () => {
    if (notifPerm === 'default') {
      const res = await requestNotificationPermission();
      setNotifPerm(res);
      playNotificationChime();
    } else {
      playNotificationChime();
    }
  };
  return (
    <nav className="flex-shrink-0 bg-syndae-900/90 backdrop-blur-xl border-b border-syndae-800/80 px-4 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] flex items-center justify-between text-xs z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <div
          onClick={() => onSelectTab('chat')}
          className="flex items-center space-x-2.5 cursor-pointer group"
          title="Return to Chat"
        >
          <img
            src="/icon-192.png"
            alt="Syndae Icon"
            className="w-5 h-5 rounded-md shadow-sm border border-emerald-500/30 object-cover group-hover:scale-105 transition-transform"
          />
          <span className="font-bold tracking-wider text-base text-slate-100 font-sans group-hover:text-emerald-400 transition-colors">
            SYNDAE
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            AI
          </span>
        </div>

        {/* Active Model Pill - Clickable to open Model Orchestrator */}
        <button
          type="button"
          onClick={() => onSelectTab('models')}
          title="Click to view AI engine settings"
          className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-syndae-800/80 hover:bg-syndae-750 border border-syndae-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition-all duration-200 text-xs shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="truncate max-w-[130px] md:max-w-[200px] font-medium text-slate-200">
            {telemetry?.active_model?.split(':')[0]?.replace('QuantTrio/', '') || 'Smart Assistant'}
          </span>
        </button>
      </div>

      {/* Center Desktop Navigation Tabs */}
      <div className="hidden md:flex items-center space-x-1.5 bg-syndae-950/80 p-1 rounded-xl border border-syndae-800/80 shadow-inner">
        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className={`px-4 py-1.5 rounded-lg flex items-center space-x-2 font-medium transition-all duration-200 text-xs ${
            activeTab === 'chat'
              ? 'bg-syndae-800 text-emerald-300 shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-syndae-900/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat & Assistant</span>
          {pendingTickets.length > 0 && (
            <span className="bg-rose-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold animate-pulse">
              {pendingTickets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`px-4 py-1.5 rounded-lg flex items-center space-x-2 font-medium transition-all duration-200 text-xs ${
            activeTab === 'settings' || activeTab === 'models' || activeTab === 'memory' || activeTab === 'tools'
              ? 'bg-syndae-800 text-violet-300 shadow-sm border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-syndae-900/60'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-violet-400" />
          <span>Assistant Settings</span>
        </button>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 text-[11px] text-slate-400">
        {isNotificationSupported() && (
          <button
            type="button"
            onClick={handleToggleNotifications}
            title={
              notifPerm === 'granted'
                ? 'Alerts active (click to test chime)'
                : 'Click to enable alerts when agent requires input'
            }
            className={`p-1.5 rounded-lg border text-[11px] transition-colors flex items-center justify-center ${
              notifPerm === 'granted'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:text-amber-300 hover:border-amber-500/40'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTelemetryStrip}
          title="Toggle Device Stats"
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
            showTelemetryStrip
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
              : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
        >
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Stats</span>
        </button>

        <div
          onClick={() => onSelectTab('settings')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-syndae-800/80 border border-syndae-700/60 text-slate-300 cursor-pointer hover:border-emerald-500/40 hover:text-emerald-200 transition-colors"
          title="Open profile in settings"
        >
          <User className="w-3 h-3 text-emerald-400" />
          <span className="font-semibold text-emerald-300 truncate max-w-[90px] sm:max-w-none">
            {authStatus?.operator_name || 'My Assistant'}
          </span>
        </div>

        <button
          type="button"
          onClick={onLock}
          title="Lock Syndae device"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-rose-950/50 border border-zinc-700/50 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-colors"
        >
          <Lock className="w-3 h-3" />
          <span className="hidden sm:inline">LOCK</span>
        </button>
      </div>
    </nav>
  );
};
