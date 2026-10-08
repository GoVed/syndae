import React from 'react';
import {
  Search,
  Globe,
  Brain,
  MessageSquare,
  Image as ImageIcon,
  Terminal,
  Wrench,
  Sparkles,
} from 'lucide-react';

export interface FormattedToolInfo {
  friendlyName: string;
  actionDescription: string;
  summaryDetail?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function formatToolActivity(toolName: string, args: any): FormattedToolInfo {
  const safeArgs = args && typeof args === 'object' ? args : {};
  const cleanName = (toolName || '').toLowerCase().trim();

  if (cleanName === 'web_search') {
    const q = safeArgs.query || safeArgs.q || '';
    return {
      friendlyName: 'Web Search',
      actionDescription: q ? `Searching the web for "${q}"` : 'Searching the web...',
      summaryDetail: q ? `Query: "${q}"` : undefined,
      icon: Search,
    };
  }

  if (cleanName === 'read_web_page' || cleanName === 'fetch_page' || cleanName === 'fetch_web_page') {
    const u = safeArgs.url || safeArgs.uri || '';
    let host = '';
    try {
      if (u) host = new URL(u).hostname.replace(/^www\./, '');
    } catch {}
    return {
      friendlyName: 'Read Webpage',
      actionDescription: host ? `Reading webpage on ${host}...` : 'Reading webpage...',
      summaryDetail: u ? `URL: ${u}` : undefined,
      icon: Globe,
    };
  }

  if (cleanName === 'search_memory') {
    const q = safeArgs.query || '';
    return {
      friendlyName: 'Search Memory',
      actionDescription: q ? `Searching memory for "${q}"` : 'Searching personal memory...',
      summaryDetail: q ? `Query: "${q}"` : undefined,
      icon: Brain,
    };
  }

  if (cleanName === 'read_memory') {
    const p = (safeArgs.path || safeArgs.filepath || '').replace(/^(\/memory\/|memory\/)/, '');
    return {
      friendlyName: 'Read Memory',
      actionDescription: p ? `Reviewing memory note (${p})...` : 'Consulting memory notes...',
      summaryDetail: p ? `File: ${p}` : undefined,
      icon: Brain,
    };
  }

  if (cleanName === 'write_memory') {
    const p = (safeArgs.path || safeArgs.filepath || '').replace(/^(\/memory\/|memory\/)/, '');
    const s = safeArgs.section ? ` [${safeArgs.section}]` : '';
    return {
      friendlyName: 'Update Memory',
      actionDescription: p ? `Updating memory note (${p}${s})...` : 'Saving memory note...',
      summaryDetail: p ? `File: ${p}${s}` : undefined,
      icon: Brain,
    };
  }

  if (cleanName === 'send_message') {
    const to = safeArgs.to || safeArgs.recipient || '';
    return {
      friendlyName: 'Send Message',
      actionDescription: to ? `Preparing message for ${to}...` : 'Sending message...',
      summaryDetail: to ? `Recipient: ${to}` : undefined,
      icon: MessageSquare,
    };
  }

  if (cleanName === 'send_image' || cleanName === 'send_gif' || cleanName === 'send_sticker') {
    const to = safeArgs.to || '';
    return {
      friendlyName: cleanName === 'send_sticker' ? 'Send Sticker' : 'Send Image',
      actionDescription: to ? `Sharing media with ${to}...` : 'Sending media...',
      summaryDetail: to ? `Recipient: ${to}` : undefined,
      icon: ImageIcon,
    };
  }

  if (cleanName === 'send_reaction') {
    const emoji = safeArgs.emoji || 'reaction';
    const to = safeArgs.to || safeArgs.chat || '';
    return {
      friendlyName: 'Send Reaction',
      actionDescription: to ? `Reacting with ${emoji} in ${to}...` : `Reacting with ${emoji}...`,
      summaryDetail: emoji ? `Emoji: ${emoji}` : undefined,
      icon: Sparkles,
    };
  }

  if (cleanName === 'inspect_image') {
    return {
      friendlyName: 'Inspect Image',
      actionDescription: 'Analyzing image details...',
      icon: ImageIcon,
    };
  }

  if (cleanName === 'translate') {
    const lang = safeArgs.target_lang || safeArgs.language || '';
    return {
      friendlyName: 'Translate',
      actionDescription: lang ? `Translating into ${lang}...` : 'Translating content...',
      summaryDetail: lang ? `Language: ${lang}` : undefined,
      icon: Globe,
    };
  }

  if (cleanName === 'exec_container_command') {
    const cmd = (safeArgs.command || '').trim();
    const briefCmd = cmd ? cmd.split('\n')[0].substring(0, 45) : '';
    return {
      friendlyName: 'System Command',
      actionDescription: briefCmd ? `Running: ${briefCmd}...` : 'Executing command...',
      summaryDetail: briefCmd,
      icon: Terminal,
    };
  }

  if (cleanName.startsWith('immich_')) {
    const action = cleanName.replace('immich_', '').replace(/_/g, ' ');
    return {
      friendlyName: 'Immich Photos',
      actionDescription: `Immich photos: ${action}...`,
      summaryDetail: `Action: ${action}`,
      icon: ImageIcon,
    };
  }

  // Fallback for any other custom tool
  const readable = toolName
    .replace(/^tool_|^mcp_/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    friendlyName: readable,
    actionDescription: `Running ${readable}...`,
    icon: Wrench,
  };
}
