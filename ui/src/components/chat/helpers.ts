import { marked } from 'marked';
import { InteractiveOption, ParsedToolEvent } from './types';

export const resolveImageUrl = (img: string): string => {
  if (!img || typeof img !== 'string') return '';
  if (img.startsWith('data:')) {
    return img;
  }
  if (
    img.startsWith('http://localhost') ||
    img.startsWith('http://127.0.0.1') ||
    img.startsWith('http://host.docker.internal') ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:' && img.startsWith('http://'))
  ) {
    return `/api/tools/media?url=${encodeURIComponent(img)}`;
  }
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
    return img;
  }
  return `/api/memory/raw?path=${encodeURIComponent(img)}`;
};

export const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean.startsWith('data:image/')) return true;
  if (clean.includes('/api/memory/raw')) return true;
  if (clean.includes('/api/tools/media')) return true;

  if (/\.(jpeg|jpg|png|webp|gif|svg|avif|bmp)(?:[?#].*)?$/i.test(clean)) {
    return true;
  }

  if (
    clean.includes('images.unsplash.com/') ||
    clean.includes('images.pexels.com/') ||
    clean.includes('cdn.pixabay.com/') ||
    clean.includes('i.imgur.com/') ||
    clean.includes('i.redd.it/') ||
    clean.includes('upload.wikimedia.org/')
  ) {
    return true;
  }

  return false;
};

marked.setOptions({
  breaks: true,
  gfm: true,
});

marked.use({
  renderer: {
    link({ href, title, text }: { href: string; title?: string | null; text: string }) {
      if (href && href.startsWith('file://')) {
        const cleanPath = href.replace(/^file:\/\//, '');
        return `<code class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-syndae-900 text-emerald-400 border border-syndae-700 select-all inline-block" title="Local file: ${cleanPath}">${text || cleanPath}</code>`;
      }

      if (isImageUrl(href)) {
        const resolvedHref = resolveImageUrl(href);
        const isGeneric = (str?: string | null) => !str || /^(image|image preview|photo|picture)$/i.test(str.trim()) || str.trim() === href.trim();
        const caption = !isGeneric(text) ? text : (!isGeneric(title) ? (title || '') : '');
        return `<div class="my-2.5 max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-lg bg-syndae-950/80 group image-card-box">
  <div class="relative overflow-hidden max-h-80 flex items-center justify-center bg-black/40">
    <img src="${resolvedHref}" alt="${caption}" class="w-full h-auto max-h-80 object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" onerror="const b = this.closest('.image-card-box'); if (b) { b.outerHTML = '<div class=\\'my-2 p-2.5 rounded-xl bg-syndae-900 border border-syndae-800 text-xs text-slate-400 flex items-center justify-between gap-3\\'><span>⚠️ Image link unavailable</span><a href=\\'${resolvedHref}\\' target=\\'_blank\\' rel=\\'noopener noreferrer\\' class=\\'text-emerald-400 hover:underline text-[11px] font-mono truncate max-w-[240px]\\'>${caption || text || resolvedHref} ↗</a></div>'; }" />
  </div>
  ${caption ? `<div class="px-3 py-1.5 text-xs text-slate-300 bg-syndae-900/90 border-t border-white/5 flex items-center justify-between"><span>${caption}</span><a href="${resolvedHref}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline">Open ↗</a></div>` : ''}
</div>`;
      }

      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="text-emerald-400 hover:underline">${text}</a>`;
    },
    image({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const resolvedHref = resolveImageUrl(href);
      const isGeneric = (str?: string | null) => !str || /^(image|image preview|photo|picture)$/i.test(str.trim()) || str.trim() === href.trim();
      const caption = !isGeneric(text) ? text : (!isGeneric(title) ? (title || '') : '');
      return `<div class="my-2.5 max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-lg bg-syndae-950/80 group image-card-box">
  <div class="relative overflow-hidden max-h-80 flex items-center justify-center bg-black/40">
    <img src="${resolvedHref}" alt="${caption}" class="w-full h-auto max-h-80 object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" onerror="const b = this.closest('.image-card-box'); if (b) { b.outerHTML = '<div class=\\'my-2 p-2.5 rounded-xl bg-syndae-900 border border-syndae-800 text-xs text-slate-400 flex items-center justify-between gap-3\\'><span>⚠️ Image unavailable</span><a href=\\'${resolvedHref}\\' target=\\'_blank\\' rel=\\'noopener noreferrer\\' class=\\'text-emerald-400 hover:underline text-[11px] font-mono truncate max-w-[240px]\\'>${caption || text || resolvedHref} ↗</a></div>'; }" />
  </div>
  ${caption ? `<div class="px-3 py-1.5 text-xs text-slate-300 bg-syndae-900/90 border-t border-white/5 flex items-center justify-between"><span>${caption}</span><a href="${resolvedHref}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline">Open ↗</a></div>` : ''}
</div>`;
    },
  },
});

export const renderMarkdown = (content: string): string => {
  if (!content) return '';
  try {
    return marked.parse(content) as string;
  } catch (e) {
    return content;
  }
};

export const extractThoughtAndContent = (
  rawContent: string,
  existingThought?: string | null
): { thought: string | null; content: string } => {
  let thought = existingThought && existingThought.trim().length > 0 ? existingThought.trim() : null;
  let content = rawContent || '';

  // 1. Check for <think>...</think> or <thought>...</thought> tags
  const thinkTagRegex = /<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/i;
  const match = content.match(thinkTagRegex);
  if (match) {
    const extracted = match[1].trim();
    if (!thought) {
      thought = extracted;
    } else if (!thought.includes(extracted)) {
      thought = `${thought}\n\n${extracted}`;
    }
    content = content.replace(thinkTagRegex, '').trim();
  } else {
    // 1b. Check for orphan closing </think> or </thought> tag (where opening tag was already stripped)
    const orphanCloseMatch = content.match(/^([\s\S]*?)<\/(?:think|thought)>/i);
    if (orphanCloseMatch) {
      const extracted = orphanCloseMatch[1].trim();
      if (!thought) {
        thought = extracted;
      } else if (!thought.includes(extracted)) {
        thought = `${thought}\n\n${extracted}`;
      }
      content = content.replace(/^[\s\S]*?<\/(?:think|thought)>\s*/i, '').trim();
    } else {
      // Check if starts with unclosed <think> or <thought>
      const openThinkMatch = content.match(/^<(?:think|thought)>([\s\S]*)$/i);
      if (openThinkMatch) {
        if (!thought) {
          thought = openThinkMatch[1].trim();
        }
        content = '';
      }
    }
  }

  // 2. Check for "Thinking Process: ... "
  const processRegex = /^(?:Thinking Process|Reasoning Process):\s*([\s\S]*?)(?:\n\n(?=[A-Z0-9#*`])|<\/think>|$)/i;
  const processMatch = content.match(processRegex);
  if (processMatch) {
    const extracted = processMatch[1].trim();
    if (!thought) {
      thought = extracted;
    } else if (!thought.includes(extracted)) {
      thought = `${thought}\n\n${extracted}`;
    }
    content = content.replace(processRegex, '').replace(/<\/think>/g, '').trim();
  }

  // 2b. Check for bracketed thought / reasoning blocks like [Memory Check] ... or [Plan] ...
  const bracketRegex = /^\[(?:Memory Check|Reasoning|Plan|Thought|Internal|Context)\][\s\S]*?(?:\n\n(?=[A-Z0-9#*`]|Hello|Welcome|<options>)|$)/i;
  const bracketMatch = content.match(bracketRegex);
  if (bracketMatch) {
    const extracted = bracketMatch[0].trim();
    if (!thought) {
      thought = extracted;
    } else if (!thought.includes(extracted)) {
      thought = `${thought}\n\n${extracted}`;
    }
    content = content.replace(bracketRegex, '').trim();
  }

  // 3. Extract leading untagged meta-reasoning paragraphs
  const metaReasoningRegex =
    /^(?:\[(?:Memory Check|Reasoning|Plan|Thought|Internal|Context)\]|Okay[,.]|Alright[,.]|Looking at|The user|Since (?:I|there)|I should|I shouldn't|I need to|I'll|I will|Let me|Based on|From (?:my |the )?(?:memory|scratchpad)|Thinking Process|Reasoning Process|The daily log|As (?:Syndae|an AI)|However, I (?:don't|do not)|I don't have access|The memory only contains|Given (?:the |this )?|Considering (?:the |this )?|In this (?:conversation|context)|To respond to the user)/i;

  const isMetaPara = (p: string): boolean => {
    const pTrim = p.trim();
    const lower = pTrim.toLowerCase();
    return (
      metaReasoningRegex.test(pTrim) ||
      ['is asking ', 'has chosen ', 'has asked ', 'wants me to ', 'i should ', 'i need to ', "i'll ", 'i will ', 'system instructions', 'onboarding mode', '<options> block', 'wrap my thinking'].some(s => lower.includes(s)) ||
      pTrim.startsWith('- ') || pTrim.startsWith('* ') || /^\d+\.\s/.test(pTrim)
    );
  };

  const trimmedContent = content.trim();
  const paragraphs = trimmedContent.split(/\n\n+/);
  if (paragraphs.length > 1 && isMetaPara(paragraphs[0])) {
    const thoughtParas: string[] = [];
    const contentParas: string[] = [];
    let inLeadingThought = true;

    for (const para of paragraphs) {
      const pTrim = para.trim();
      if (!pTrim) continue;

      if (inLeadingThought) {
        if (isMetaPara(pTrim)) {
          thoughtParas.push(pTrim);
        } else {
          inLeadingThought = false;
          contentParas.push(pTrim);
        }
      } else {
        contentParas.push(pTrim);
      }
    }

    if (thoughtParas.length > 0 && contentParas.length > 0) {
      const leadingThought = thoughtParas.join('\n\n');
      if (!thought) {
        thought = leadingThought;
      } else if (!thought.includes(leadingThought)) {
        thought = `${thought}\n\n${leadingThought}`;
      }
      content = contentParas.join('\n\n');
    }
  }

  if (thought) {
    thought = thought.replace(/^(?:tags[.:\s]*\n*)+/i, '').trim();
    if (thought.length === 0) thought = null;
  }

  // Strip any <title>...</title> or <suggested_title>...</suggested_title> tags from visible content
  content = content.replace(/<(?:title|suggested_title)>[\s\S]*?(?:<\/(?:title|suggested_title)>|$)/gi, '').trim();

  return { thought, content };
};

export const extractSuggestedTitle = (
  rawContent: string
): { content: string; title: string | null } => {
  if (!rawContent) return { content: '', title: null };
  const titleRegex = /<(?:title|suggested_title)>([\s\S]*?)(?:<\/(?:title|suggested_title)>|$)/i;
  const match = rawContent.match(titleRegex);
  let title: string | null = null;
  let content = rawContent;
  if (match) {
    const rawTitle = match[1].replace(/["'`*#]/g, '').trim();
    const lower = rawTitle.toLowerCase();
    if (
      rawTitle.length > 0 &&
      rawTitle.length <= 60 &&
      lower !== 'new mission workspace' &&
      lower !== 'new chat' &&
      lower !== 'new task' &&
      lower !== 'active session' &&
      lower !== 'untitled session' &&
      lower !== 'chat'
    ) {
      title = rawTitle;
    }
    content = rawContent.replace(titleRegex, '').trim();
  }
  return { content, title };
};

export const extractOptionsAndContent = (
  rawContent: string
): { content: string; options: InteractiveOption[] } => {
  const options: InteractiveOption[] = [];
  let content = rawContent || '';

  // 1. Parse complete <options>...</options>
  const optionsRegex = /<options>([\s\S]*?)<\/options>/i;
  const match = content.match(optionsRegex);
  if (match) {
    const rawOptionsBlock = match[1];
    content = content.replace(/<options>[\s\S]*?<\/options>/gi, '').trim();
    content = content.replace(/<options>[\s\S]*$/gi, '').trim();

    // Check for <option ...>...</option> tags
    const optionTagRegex = /<option(?:\s+[^>]*)?>([\s\S]*?)<\/option>/gi;
    let tagMatch;
    let idx = 0;
    while ((tagMatch = optionTagRegex.exec(rawOptionsBlock)) !== null) {
      const fullTag = tagMatch[0];
      const optText = tagMatch[1].trim();
      const isOther =
        fullTag.toLowerCase().includes('other="true"') ||
        optText.toLowerCase().startsWith('other') ||
        optText.toLowerCase().includes('other:');
      if (optText.length > 0) {
        options.push({
          id: `opt-${idx++}`,
          label: cleanOptionLabel(optText, isOther),
          isOther,
        });
      }
    }

    // Fallback: if no <option> tags were found, parse line by line (e.g. - Option 1)
    if (options.length === 0) {
      const lines = rawOptionsBlock.split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^[\s*\-•\d.]+\s*/, '').trim();
        if (cleaned.length > 0) {
          const isOther =
            cleaned.toLowerCase().startsWith('other') ||
            cleaned.toLowerCase().includes('other:');
          options.push({
            id: `opt-${idx++}`,
            label: cleanOptionLabel(cleaned, isOther),
            isOther,
          });
        }
      }
    }
  } else {
    // 2. Unclosed / partial <options> tag at the tail (e.g. while streaming)
    const lastOpenIdx = content.lastIndexOf('<options>');
    if (lastOpenIdx !== -1) {
      const tailBlock = content.slice(lastOpenIdx);
      const optionTagRegex = /<option(?:\s+[^>]*)?>([\s\S]*?)<\/option>/gi;
      let tagMatch;
      let idx = 0;
      while ((tagMatch = optionTagRegex.exec(tailBlock)) !== null) {
        const fullTag = tagMatch[0];
        const optText = tagMatch[1].trim();
        const isOther =
          fullTag.toLowerCase().includes('other="true"') ||
          optText.toLowerCase().startsWith('other') ||
          optText.toLowerCase().includes('other:');
        if (optText.length > 0) {
          options.push({
            id: `opt-${idx++}`,
            label: cleanOptionLabel(optText, isOther),
            isOther,
          });
        }
      }
      content = content.slice(0, lastOpenIdx).trim();
    }
  }

  // Also strip any dangling unclosed <option... or < tag at the very end of content
  content = content.replace(/<(?:option\b(?:\s+[^>]*)?(?:>[^<]*)?)?$/i, '').trim();

  // If options were found but none was marked 'Other', automatically append an Other option
  if (options.length > 0 && !options.some(o => o.isOther)) {
    options.push({
      id: `opt-${options.length}`,
      label: 'Other (specify details)...',
      isOther: true,
    });
  }

  return { content, options };
};

export function cleanOptionLabel(optText: string, isOther: boolean): string {
  if (isOther) return optText;
  const parenMatch = optText.match(/\(([^()]{5,})\)\s*$/);
  if (parenMatch && /[a-zA-Z]{3,}/.test(parenMatch[1])) {
    return `Translate and send: "${parenMatch[1].trim()}"`;
  }
  if (/^(?:Playful|Jokena|Casual|Joke|Meme|Friendly)?\s*(?:Gujlish|Hinglish|Dialect):\s*/i.test(optText)) {
    return optText.replace(/^(?:Playful|Jokena|Casual|Joke|Meme|Friendly)?\s*(?:Gujlish|Hinglish|Dialect):\s*/i, 'Translate and send: ');
  }
  return optText;
}

function formatProtocol(p: string): string {
  const clean = p.split('/')[0].trim().toLowerCase();
  if (clean === 'whatsapp') return 'WhatsApp';
  if (clean === 'imessage') return 'iMessage';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function parseToolEvent(content: string): ParsedToolEvent | null {
  if (
    !content.startsWith('[EXTERNAL') &&
    !content.startsWith('[INCOMING TOOL EVENT') &&
    !content.startsWith('[NOTIFICATION: INCOMING') &&
    !content.startsWith('🔔')
  ) {
    return null;
  }

  let protocol = 'External';
  const protoMatch =
    content.match(/\[INCOMING TOOL EVENT:\s*([^\]]+)\]/i) ||
    content.match(/Incoming\s+([A-Za-z0-9_-]+)\s+(?:Group\s+)?(?:Message|Event)/i) ||
    content.match(/\[EXTERNAL\s+([A-Za-z0-9_-]+)/i) ||
    content.match(/\[NOTIFICATION:\s*INCOMING\s+([A-Za-z0-9_-]+)/i);
  if (protoMatch) {
    protocol = formatProtocol(protoMatch[1]);
  }

  let senderName = '';
  let channel = '';
  let messageText = '';
  const isGroup = /group/i.test(content);

  const senderMatch =
    content.match(/(?:•\s*Sender:|\bSender:|\bFrom:)\s*([^\n]+)/i) ||
    content.match(/from\s+'([^']+)'/i) ||
    content.match(/Source:\s*([^\n]+)/i);
  if (senderMatch) senderName = senderMatch[1].trim();

  const channelMatch =
    content.match(/(?:•\s*Recipient \/ Channel:|•\s*Channel:|\bChannel:)\s*([^\n]+)/i) ||
    content.match(/in\s+'([^']+)'/i) ||
    content.match(/\(ID:\s*([^\)]+)\)/i);
  if (channelMatch) channel = channelMatch[1].trim();

  const msgContentMatch =
    content.match(/(?:•\s*Action:|\bAction:)\s*([^\n]+)/i) ||
    content.match(/(?:•\s*Message Content:|\bMessage Content:|\bMessage:)\s*"([^"]+)"/i) ||
    content.match(/(?:•\s*Message Content:|\bMessage Content:|\bMessage:)\s*([^\n]+)/i) ||
    content.match(/\n"([^"]+)"\n/);
  if (msgContentMatch) {
    messageText = msgContentMatch[1].trim();
  } else {
    const jsonMsgMatch = content.match(/"message":\s*"([^"]+)"/);
    if (jsonMsgMatch) messageText = jsonMsgMatch[1].trim();
  }

  let replyTo = '';
  const replyMatch =
    content.match(/(?:•\s*Replying To:|•\s*Replying to:|\bReplying To:|\bReplying to:)\s*"([^"]+)"(?:\s*\((?:by\s+)?([^)]+)\))?/i) ||
    content.match(/(?:•\s*Replying To:|•\s*Replying to:|\bReplying To:|\bReplying to:)\s*([^\n]+)/i);
  if (replyMatch) {
    if (replyMatch[2]) {
      replyTo = `"${replyMatch[1].trim()}" (${replyMatch[2].trim()})`;
    } else {
      replyTo = replyMatch[1].trim().replace(/^"|"$/g, '');
    }
  }

  return {
    protocol,
    senderName: senderName || 'External Contact',
    channel: channel || (isGroup ? 'Group Chat' : 'Direct Chat'),
    messageText: messageText || '(Event or media received)',
    isGroup,
    replyTo: replyTo || undefined,
    rawContent: content,
  };
}
