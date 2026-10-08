import { InteractiveOption, ParsedToolEvent } from './types';

export { resolveImageUrl, isImageUrl, renderMarkdown } from './markdownRenderer';
export { buildTimelineSteps } from './timelineBuilder';
export type { TimelineResult } from './timelineBuilder';

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
  // Only match explicit internal monologue discussing the user in 3rd person or internal markers,
  // NOT conversational first-person phrases like "Let me...", "I will...", "Looking at...", "Based on...", lists, etc.
  const isMetaPara = (p: string): boolean => {
    const pTrim = p.trim();
    const lower = pTrim.toLowerCase();
    return (
      lower.startsWith('the user is asking') ||
      lower.startsWith('the user has asked') ||
      lower.startsWith('the user has chosen') ||
      lower.startsWith('the user wants me to') ||
      lower.startsWith('the user wants to') ||
      lower.startsWith('the user prompted') ||
      lower.startsWith('the operator is asking') ||
      lower.startsWith('operator is asking') ||
      lower.startsWith('thinking process:') ||
      lower.startsWith('reasoning process:') ||
      lower.startsWith('step 1:') ||
      lower.startsWith('[reasoning]') ||
      lower.startsWith('[thought]') ||
      lower.startsWith('[plan]')
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
