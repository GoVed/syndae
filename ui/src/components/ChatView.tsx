import React, { useState, useEffect, useRef } from 'react';
import { Bot, Zap, BrainCircuit, Menu, Sparkles, Settings, Pencil } from 'lucide-react';
import { ChatMessage } from '../types';
import {
  extractThoughtAndContent,
  extractOptionsAndContent,
  extractSuggestedTitle,
  parseToolEvent,
  renderMarkdown,
} from './chat/helpers';
import {
  InteractiveOption,
  ParsedToolEvent,
  ToolExecutionCard,
  ChatViewProps,
} from './chat/types';
import { SessionSidebar } from './chat/SessionSidebar';
import { MessageItem } from './chat/MessageItem';
import { StreamingResponse } from './chat/StreamingResponse';
import { ApprovalTicketCard } from './chat/ApprovalTicketCard';
import { ChatInputBar } from './chat/ChatInputBar';

export {
  extractThoughtAndContent,
  extractOptionsAndContent,
  extractSuggestedTitle,
  parseToolEvent,
  renderMarkdown,
};
export type {
  InteractiveOption,
  ParsedToolEvent,
  ToolExecutionCard,
  ChatViewProps,
};

export const ChatView: React.FC<ChatViewProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  pendingTickets,
  onResolveTicket,
  memoryFiles,
  onSendPrompt,
  liveThought,
  liveStreamingText,
  liveToolExecutions,
  isStreaming,
  chatError,
  onClearChatError,
  messages: propMessages,
  onNavigateToSettings,
  onRenameSession,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const messages = propMessages ?? internalMessages;
  const [mode, setMode] = useState<'chat' | 'mission'>(activeSession?.mode === 'mission' ? 'mission' : 'chat');
  const [editingTicket, setEditingTicket] = useState<{ id: string; argsStr: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<{ id: string; text: string } | null>(null);
  const [expandedHistoricalThoughts, setExpandedHistoricalThoughts] = useState<Record<string, boolean>>({});
  const [activeOtherMsgId, setActiveOtherMsgId] = useState<string | null>(null);
  const [otherInputText, setOtherInputText] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const handleAddImages = (newImgs: string[]) => {
    setAttachedImages(prev => [...prev, ...newImgs]);
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartHeaderRename = () => {
    if (!activeSession || !onRenameSession) return;
    setEditedTitle(activeSession.title);
    setIsEditingTitle(true);
  };

  const handleSaveHeaderRename = () => {
    const trimmed = editedTitle.trim();
    if (activeSession && trimmed && trimmed !== activeSession.title && onRenameSession) {
      onRenameSession(activeSession.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendOption = (optionLabel: string) => {
    if (!activeSession || isStreaming) return;
    onSendPrompt(activeSession.id, optionLabel, mode);
  };

  useEffect(() => {
    if (activeSession) {
      setMode(activeSession.mode === 'mission' ? 'mission' : 'chat');
      if (!propMessages) {
        loadInternalMessages(activeSession.id);
      }
    }
  }, [activeSession?.id, propMessages]);

  const loadInternalMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      const data = await res.json();
      if (data.success) {
        setInternalMessages(data.messages);
      }
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, liveStreamingText, liveThought, liveToolExecutions]);

  const handleSend = (imagesToSend?: string[]) => {
    const imgs = imagesToSend ?? (attachedImages.length > 0 ? attachedImages : undefined);
    if ((!inputPrompt.trim() && (!imgs || imgs.length === 0)) || !activeSession || isStreaming) return;

    const finalPrompt = inputPrompt.trim() || (imgs && imgs.length > 0 ? 'Analyze this image.' : '');
    onSendPrompt(activeSession.id, finalPrompt, mode, imgs);
    setInputPrompt('');
    setAttachedImages([]);
  };

  const sessionTickets = pendingTickets.filter(
    t => !activeSession || t.session_id === activeSession.id
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-syndae-950 font-sans">
      {/* Session Drawer / Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeSession={activeSession}
        mobileSidebarOpen={mobileSidebarOpen}
        onSelectSession={onSelectSession}
        onCreateSession={onCreateSession}
        onDeleteSession={onDeleteSession}
        onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
        onNavigateToSettings={onNavigateToSettings}
        onRenameSession={onRenameSession}
      />

      {/* Central Chat Stream */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-syndae-950">
        {/* Chat Header / Mode Bar with Safe Area Top Support */}
        <div className="p-2 sm:p-2.5 px-3 sm:px-4 pt-[max(0.6rem,env(safe-area-inset-top))] md:pt-2.5 border-b border-syndae-800 bg-syndae-900 flex items-center justify-between text-xs flex-shrink-0 z-20">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-syndae-850 hover:bg-syndae-800 text-slate-300 border border-syndae-700/80 flex-shrink-0 transition-colors"
              title="Open workspaces drawer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {isEditingTitle ? (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveHeaderRename();
                }}
                className="flex items-center space-x-1"
              >
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleSaveHeaderRename}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="px-2 py-0.5 rounded bg-syndae-800 text-slate-200 border border-cyan-500 text-xs focus:outline-none"
                />
              </form>
            ) : (
              <div className="flex items-center space-x-1.5 group max-w-[120px] sm:max-w-xs">
                <span
                  onClick={handleStartHeaderRename}
                  className={`font-semibold text-slate-200 truncate text-xs ${
                    onRenameSession && activeSession ? 'cursor-pointer hover:text-cyan-200' : ''
                  }`}
                  title={onRenameSession && activeSession ? 'Click to rename' : undefined}
                >
                  {activeSession?.title || 'No active session'}
                </span>
                {activeSession && onRenameSession && (
                  <button
                    type="button"
                    onClick={handleStartHeaderRename}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-opacity"
                    title="Rename chat"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex bg-syndae-950/80 p-0.5 rounded-xl border border-syndae-800/80">
              <button
                type="button"
                onClick={() => setMode('chat')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                  mode === 'chat'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Conversational Chat Mode"
              >
                <Bot className={`w-3.5 h-3.5 ${mode === 'chat' ? 'text-white' : 'text-emerald-400'}`} />
                <span className="hidden xs:inline">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('mission')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                  mode === 'mission'
                    ? 'bg-amber-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Deep Task Mode"
              >
                <Zap className={`w-3.5 h-3.5 ${mode === 'mission' ? 'text-white' : 'text-amber-400'}`} />
                <span className="hidden xs:inline">Task</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {isStreaming && (
              <div className="flex items-center space-x-1.5 text-emerald-300 text-xs px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-medium">Thinking...</span>
              </div>
            )}

            {/* Mobile Settings Shortcut */}
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="md:hidden p-1.5 rounded-lg bg-syndae-850 hover:bg-syndae-800 text-slate-300 hover:text-white border border-syndae-700/80 transition-colors"
                title="Open Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-w-0">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto space-y-4 p-4 my-auto animate-fade-in">
              <div className="w-16 h-16 rounded-2xl border border-emerald-500/30 flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/icon-192.png" alt="Syndae AI" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-100">How can I help you today?</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                  Your private on-device AI companion. Ready for chats, complex reasoning, memory organization, and autonomous task assistance.
                </p>
              </div>

              {/* Quick suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2 text-left">
                <button
                  type="button"
                  onClick={() => setInputPrompt('What can you help me with and how does your memory work?')}
                  className="p-3 rounded-xl bg-syndae-900/60 hover:bg-syndae-850 border border-syndae-800/80 hover:border-zinc-700 transition-all duration-200 text-xs group cursor-pointer shadow-sm hover:-translate-y-0.5"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-white flex items-center space-x-1.5">
                    <span>✨ Explore Capabilities</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Discover tools, skills, and memory features</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInputPrompt('Help me organize a plan for my current project.')}
                  className="p-3 rounded-xl bg-syndae-900/60 hover:bg-syndae-850 border border-syndae-800/80 hover:border-zinc-700 transition-all duration-200 text-xs group cursor-pointer shadow-sm hover:-translate-y-0.5"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-white flex items-center space-x-1.5">
                    <span>⚡ Plan a Mission or Task</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Break down objectives into concrete steps</div>
                </button>
              </div>
            </div>
          )}

          {/* Historical Messages */}
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              message={msg}
              nextMessage={messages[index + 1]}
              isStreaming={isStreaming}
              isThoughtOpen={expandedHistoricalThoughts[msg.id] ?? false}
              activeOtherMsgId={activeOtherMsgId}
              otherInputText={otherInputText}
              onToggleThought={id =>
                setExpandedHistoricalThoughts(prev => ({
                  ...prev,
                  [id]: !prev[id],
                }))
              }
              onSendOption={handleSendOption}
              onToggleOther={msgId => {
                setActiveOtherMsgId(activeOtherMsgId === msgId ? null : msgId);
                setOtherInputText('');
              }}
              onChangeOtherText={setOtherInputText}
              onSubmitOther={text => {
                handleSendOption(text);
                setActiveOtherMsgId(null);
                setOtherInputText('');
              }}
            />
          ))}

          {/* Real-time Streaming Response Block */}
          {isStreaming && (
            <StreamingResponse
              liveStreamingText={liveStreamingText}
              liveThought={liveThought}
              liveToolExecutions={liveToolExecutions}
            />
          )}

          {/* INLINE HUMAN-IN-THE-LOOP APPROVAL BANNERS */}
          {sessionTickets.map(ticket => (
            <ApprovalTicketCard
              key={ticket.ticket_id}
              ticket={ticket}
              editingTicket={editingTicket}
              rejectReason={rejectReason}
              onSetEditingTicket={setEditingTicket}
              onSetRejectReason={setRejectReason}
              onResolveTicket={onResolveTicket}
            />
          ))}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <ChatInputBar
          inputPrompt={inputPrompt}
          isStreaming={isStreaming}
          mode={mode}
          chatError={chatError}
          textareaRef={textareaRef}
          onChangePrompt={setInputPrompt}
          onSend={handleSend}
          onClearChatError={onClearChatError}
          attachedImages={attachedImages}
          onAddImages={handleAddImages}
          onRemoveImage={handleRemoveImage}
        />
      </main>
    </div>
  );
};
