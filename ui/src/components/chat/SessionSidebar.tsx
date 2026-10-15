import React, { useState, useMemo } from 'react';
import { X, Plus, Zap, Bot, Trash2, Settings, Pencil, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { ChatSession } from '../../types';
import { groupSessionsByRecency, getRequiredTierForSession } from './sessionGrouping';

export interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  mobileSidebarOpen: boolean;
  onSelectSession: (s: ChatSession) => void;
  onCreateSession: (mode: 'chat' | 'mission') => void;
  onDeleteSession: (id: string) => void;
  onCloseMobileSidebar: () => void;
  onNavigateToSettings?: () => void;
  onRenameSession?: (id: string, newTitle: string) => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSession,
  mobileSidebarOpen,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onCloseMobileSidebar,
  onNavigateToSettings,
  onRenameSession,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [userExpandedTier, setUserExpandedTier] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const { allGroups } = useMemo(
    () => groupSessionsByRecency(sessions, 999),
    [sessions]
  );

  const requiredTier = useMemo(
    () => getRequiredTierForSession(activeSession, allGroups),
    [activeSession, allGroups]
  );

  const effectiveTier = Math.max(userExpandedTier, requiredTier);

  const { visibleGroups, hasMore, hiddenCount } = useMemo(
    () => groupSessionsByRecency(sessions, effectiveTier),
    [sessions, effectiveTier]
  );

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleStartRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed && onRenameSession) {
      onRenameSession(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Session Drawer / Sidebar */}
      <aside
        className={`flex-shrink-0 fixed top-0 bottom-auto left-0 z-50 w-72 bg-syndae-900/95 backdrop-blur-2xl border-r border-syndae-800/80 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 md:relative md:w-64 md:h-full md:shadow-none max-md:h-[var(--app-height,100dvh)] max-md:max-h-[var(--app-height,100dvh)] ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3.5 pt-[max(0.85rem,env(safe-area-inset-top))] md:pt-3.5 border-b border-syndae-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCloseMobileSidebar}
              className="md:hidden p-1.5 rounded-lg hover:bg-syndae-800 text-slate-400 hover:text-white transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-300 tracking-wider">CHATS</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCreateSession('chat');
              onCloseMobileSidebar();
            }}
            className="p-1.5 px-2.5 rounded-lg bg-syndae-800 hover:bg-emerald-950/60 text-emerald-300 hover:text-emerald-200 text-xs flex items-center space-x-1.5 border border-syndae-700/80 hover:border-emerald-500/40 transition-all duration-200 active:scale-95 shadow-sm font-medium"
            title="Start new chat"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
          {sessions.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 space-y-1 mt-4">
              <Bot className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-slate-400">No chats yet</p>
              <p className="text-[11px]">Start a new chat above to begin.</p>
            </div>
          )}

          {visibleGroups.map(group => {
            const isGroupActive = activeSession
              ? group.sessions.some(s => s.id === activeSession.id)
              : false;
            const isCollapsed = Boolean(collapsedGroups[group.id]) && !isGroupActive;

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 pt-2 pb-0.5 text-slate-400 hover:text-slate-200 transition-colors group/hdr select-none text-left"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover/hdr:text-slate-200">
                    {group.title}
                  </span>
                  <div className="flex items-center space-x-1.5 text-slate-500 group-hover/hdr:text-slate-300">
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-syndae-800/80 border border-syndae-700/60">
                      {group.sessions.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 transition-transform" />
                    ) : (
                      <ChevronDown className="w-3 h-3 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Group Sessions */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {group.sessions.map(s => {
                      const isSelected = s.id === activeSession?.id;
                      const isEditing = editingId === s.id;
                      const isMission = s.mode === 'mission';
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (!isEditing) {
                              onSelectSession(s);
                              onCloseMobileSidebar();
                            }
                          }}
                          className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all duration-200 border ${
                            isSelected
                              ? isMission
                                ? 'bg-amber-950/25 text-slate-100 border-amber-500/30 shadow-sm font-medium'
                                : 'bg-emerald-950/25 text-slate-100 border-emerald-500/30 shadow-sm font-medium'
                              : 'text-slate-400 hover:bg-syndae-850 hover:text-slate-200 border-transparent hover:border-syndae-800/80'
                          }`}
                        >
                          {isSelected && (
                            <span
                              className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
                                isMission ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                            />
                          )}
                          <div className="flex items-center space-x-2.5 truncate pl-1 flex-1 min-w-0 mr-2">
                            {isMission ? (
                              <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            ) : (
                              <Bot className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRename(s.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                onBlur={() => handleSaveRename(s.id)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                className="w-full px-1.5 py-0.5 rounded bg-syndae-800 text-white text-xs border border-cyan-500 focus:outline-none"
                              />
                            ) : (
                              <span
                                className="truncate font-medium text-slate-200 group-hover:text-white"
                                onDoubleClick={e => {
                                  if (onRenameSession) handleStartRename(s, e);
                                }}
                              >
                                {s.title || 'Untitled Session'}
                              </span>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0">
                              {onRenameSession && (
                                <button
                                  type="button"
                                  onClick={e => handleStartRename(s, e)}
                                  className="p-1 rounded-lg hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 transition-colors"
                                  title="Rename chat"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onDeleteSession(s.id);
                                }}
                                className="p-1 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Progressive "More chats" Button */}
          {hasMore && (
            <div className="pt-2 pb-1">
              <button
                type="button"
                onClick={() => setUserExpandedTier(prev => Math.max(prev, effectiveTier) + 1)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-syndae-850 hover:bg-syndae-800 text-slate-300 hover:text-white text-xs font-medium border border-syndae-800 hover:border-syndae-700 transition-all duration-150 active:scale-[0.98] shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>More chats ({hiddenCount} earlier)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Settings Shortcut at Drawer Bottom */}
        {onNavigateToSettings && (
          <div className="p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-syndae-800 bg-syndae-900 md:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onCloseMobileSidebar();
                onNavigateToSettings();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-syndae-800 hover:bg-syndae-750 text-slate-200 text-xs font-medium border border-syndae-700/60 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Mission Control & Settings</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
