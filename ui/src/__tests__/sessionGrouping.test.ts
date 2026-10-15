import { describe, it, expect } from 'vitest';
import {
  groupSessionsByRecency,
  getRequiredTierForSession,
  SessionGroup,
} from '../components/chat/sessionGrouping';
import { ChatSession } from '../types';

describe('sessionGrouping tests', () => {
  const refDate = new Date('2026-10-14T20:00:00Z');

  const createSession = (id: string, date: Date, title = 'Test Chat'): ChatSession => ({
    id,
    title,
    mode: 'chat',
    created_at: date.toISOString(),
    updated_at: date.toISOString(),
  });

  it('handles empty sessions array', () => {
    const res = groupSessionsByRecency([], 0, refDate);
    expect(res.allGroups).toEqual([]);
    expect(res.visibleGroups).toEqual([]);
    expect(res.hasMore).toBe(false);
    expect(res.hiddenCount).toBe(0);
  });

  it('classifies sessions into today, yesterday, this week, previous 30 days, and older', () => {
    const sToday = createSession('s-today', new Date('2026-10-14T10:00:00Z'));
    const sYesterday = createSession('s-yest', new Date('2026-10-13T10:00:00Z'));
    const sThisWeek = createSession('s-week', new Date('2026-10-10T10:00:00Z'));
    const s30Days = createSession('s-30d', new Date('2026-09-25T10:00:00Z'));
    const sOlderSep = createSession('s-sep', new Date('2026-09-01T10:00:00Z'));
    const sOlderAug = createSession('s-aug', new Date('2026-08-15T10:00:00Z'));

    const sessions = [sToday, sYesterday, sThisWeek, s30Days, sOlderSep, sOlderAug];

    // Tier 0 (default): Today, Yesterday, This Week
    const tier0 = groupSessionsByRecency(sessions, 0, refDate);
    expect(tier0.visibleGroups.map(g => g.id)).toEqual(['today', 'yesterday', 'this_week']);
    expect(tier0.hasMore).toBe(true);
    expect(tier0.hiddenCount).toBe(3); // s30Days, sOlderSep, sOlderAug

    // Tier 1: Includes Previous 30 Days
    const tier1 = groupSessionsByRecency(sessions, 1, refDate);
    expect(tier1.visibleGroups.map(g => g.id)).toEqual([
      'today',
      'yesterday',
      'this_week',
      'previous_30_days',
    ]);
    expect(tier1.hasMore).toBe(true);
    expect(tier1.hiddenCount).toBe(2);

    // Tier 2: Includes next older month (September 2026)
    const tier2 = groupSessionsByRecency(sessions, 2, refDate);
    expect(tier2.visibleGroups.map(g => g.title)).toEqual([
      'Today',
      'Yesterday',
      'This Week',
      'Previous 30 Days',
      'September 2026',
    ]);
    expect(tier2.hasMore).toBe(true);
    expect(tier2.hiddenCount).toBe(1);

    // Tier 3: Includes August 2026
    const tier3 = groupSessionsByRecency(sessions, 3, refDate);
    expect(tier3.visibleGroups.map(g => g.title)).toEqual([
      'Today',
      'Yesterday',
      'This Week',
      'Previous 30 Days',
      'September 2026',
      'August 2026',
    ]);
    expect(tier3.hasMore).toBe(false);
    expect(tier3.hiddenCount).toBe(0);
  });

  it('puts sessions with missing or invalid timestamps into Today safely', () => {
    const sInvalid: ChatSession = {
      id: 'inv-1',
      title: 'No timestamp',
      mode: 'chat',
      created_at: '',
      updated_at: '',
    };
    const res = groupSessionsByRecency([sInvalid], 0, refDate);
    expect(res.visibleGroups.length).toBe(1);
    expect(res.visibleGroups[0].id).toBe('today');
    expect(res.visibleGroups[0].sessions[0].id).toBe('inv-1');
  });

  it('calculates required tier for active session', () => {
    const sToday = createSession('s-today', new Date('2026-10-14T10:00:00Z'));
    const s30Days = createSession('s-30d', new Date('2026-09-25T10:00:00Z'));
    const sOlder = createSession('s-older', new Date('2026-08-01T10:00:00Z'));

    const { allGroups } = groupSessionsByRecency([sToday, s30Days, sOlder], 0, refDate);

    expect(getRequiredTierForSession(sToday, allGroups)).toBe(0);
    expect(getRequiredTierForSession(s30Days, allGroups)).toBe(1);
    expect(getRequiredTierForSession(sOlder, allGroups)).toBe(2);
    expect(getRequiredTierForSession(null, allGroups)).toBe(0);
  });
});
