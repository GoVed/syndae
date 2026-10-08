import { ToolExecutionCard } from './types';

export interface TimelineResult {
  timelineExecutions: ToolExecutionCard[];
  finalAnswerContent: string;
  finalAnswerThought: string | null;
}

/**
 * Pairs tool executions with their corresponding step reasoning and intermediate statements,
 * separating the step-by-step timeline from the final response.
 */
export function buildTimelineSteps(
  executions: ToolExecutionCard[],
  rawContent: string,
  rawThought?: string | null
): TimelineResult {
  if (!executions || executions.length === 0) {
    return {
      timelineExecutions: [],
      finalAnswerContent: rawContent || '',
      finalAnswerThought: rawThought || null,
    };
  }

  // Check if executions already have step text attached
  const alreadyHasStepText = executions.some(e => e.text && e.text.trim().length > 0);
  if (alreadyHasStepText) {
    return {
      timelineExecutions: executions,
      finalAnswerContent: rawContent || '',
      finalAnswerThought: rawThought || null,
    };
  }

  // Fallback for existing messages: parse out intermediate transition paragraphs
  const paragraphs = (rawContent || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const transitionPrefixes = [
    'let me try',
    'let me check',
    'let me find',
    'let me search',
    'let me grab',
    'let me pull',
    'let me send',
    'looking at',
    'i found a reference',
    'i found a',
    'i will try',
    'i will search',
    'searching for',
    'checking',
    'trying with',
  ];

  const matchedStepTexts: string[] = [];
  const remainingParagraphs: string[] = [];

  for (const para of paragraphs) {
    const lower = para.toLowerCase();
    const isTransition = transitionPrefixes.some(pref => lower.startsWith(pref));
    if (isTransition && matchedStepTexts.length < executions.length) {
      matchedStepTexts.push(para);
    } else {
      remainingParagraphs.push(para);
    }
  }

  const thoughtParagraphs = (rawThought || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const timelineExecutions = executions.map((exec, idx) => ({
    ...exec,
    step: exec.step || idx + 1,
    text: exec.text || matchedStepTexts[idx] || null,
    thought: exec.thought || (thoughtParagraphs.length > 1 ? thoughtParagraphs[idx] || null : null),
  }));

  const finalAnswerContent = remainingParagraphs.join('\n\n') || rawContent || '';
  const finalAnswerThought =
    thoughtParagraphs.length > executions.length
      ? thoughtParagraphs.slice(executions.length).join('\n\n')
      : (thoughtParagraphs.length === 1 && executions.length > 0 ? null : rawThought || null);

  return {
    timelineExecutions,
    finalAnswerContent,
    finalAnswerThought,
  };
}
