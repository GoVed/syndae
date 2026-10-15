import { ChatSession } from '../../types';

export interface SessionGroup {
  id: string;
  title: string;
  tier: number;
  sessions: ChatSession[];
}

export interface GroupedSessionsResult {
  allGroups: SessionGroup[];
  visibleGroups: SessionGroup[];
  hasMore: boolean;
  hiddenCount: number;
}

/**
 * Groups chat sessions into recency periods:
 * - Tier 0: Today, Yesterday, This Week
 * - Tier 1: Previous 30 Days
 * - Tier 2+: Progressively older months in descending order
 */
export function groupSessionsByRecency(
  sessions: ChatSession[],
  visibleTier = 0,
  referenceDate: Date = new Date()
): GroupedSessionsResult {
  if (!sessions || sessions.length === 0) {
    return {
      allGroups: [],
      visibleGroups: [],
      hasMore: false,
      hiddenCount: 0,
    };
  }

  const now = referenceDate;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfThisWeek = startOfToday - 6 * 86400000; // 7 days window inclusive of today
  const startOf30Days = startOfToday - 29 * 86400000; // 30 days window inclusive of today

  const baseBuckets: Record<'today' | 'yesterday' | 'this_week' | 'previous_30_days', SessionGroup> = {
    today: { id: 'today', title: 'Today', tier: 0, sessions: [] },
    yesterday: { id: 'yesterday', title: 'Yesterday', tier: 0, sessions: [] },
    this_week: { id: 'this_week', title: 'This Week', tier: 0, sessions: [] },
    previous_30_days: { id: 'previous_30_days', title: 'Previous 30 Days', tier: 1, sessions: [] },
  };

  const olderMonthBuckets = new Map<string, SessionGroup>();

  for (const s of sessions) {
    const rawTs = s.updated_at || s.created_at;
    const ts = rawTs ? Date.parse(rawTs) : NaN;

    if (isNaN(ts) || ts >= startOfToday) {
      baseBuckets.today.sessions.push(s);
    } else if (ts >= startOfYesterday) {
      baseBuckets.yesterday.sessions.push(s);
    } else if (ts >= startOfThisWeek) {
      baseBuckets.this_week.sessions.push(s);
    } else if (ts >= startOf30Days) {
      baseBuckets.previous_30_days.sessions.push(s);
    } else {
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const title = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
      if (!olderMonthBuckets.has(key)) {
        olderMonthBuckets.set(key, { id: `older_${key}`, title, tier: 2, sessions: [] });
      }
      olderMonthBuckets.get(key)!.sessions.push(s);
    }
  }

  // Sort older months descending (e.g. 2026-09 before 2026-08)
  const sortedOlderKeys = Array.from(olderMonthBuckets.keys()).sort().reverse();
  const olderGroups: SessionGroup[] = sortedOlderKeys.map((k, idx) => {
    const group = olderMonthBuckets.get(k)!;
    group.tier = 2 + idx;
    return group;
  });

  const baseOrder: Array<'today' | 'yesterday' | 'this_week' | 'previous_30_days'> = [
    'today',
    'yesterday',
    'this_week',
    'previous_30_days',
  ];

  const populatedBaseGroups = baseOrder
    .map(key => baseBuckets[key])
    .filter(g => g.sessions.length > 0);

  const allGroups = [...populatedBaseGroups, ...olderGroups];

  const visibleGroups = allGroups.filter(g => g.tier <= visibleTier);
  const hiddenGroups = allGroups.filter(g => g.tier > visibleTier);
  const hiddenCount = hiddenGroups.reduce((acc, g) => acc + g.sessions.length, 0);

  return {
    allGroups,
    visibleGroups,
    hasMore: hiddenGroups.length > 0,
    hiddenCount,
  };
}

/**
 * Returns the minimum tier required to display the given session.
 */
export function getRequiredTierForSession(
  session: ChatSession | null,
  allGroups: SessionGroup[]
): number {
  if (!session) return 0;
  const group = allGroups.find(g => g.sessions.some(s => s.id === session.id));
  return group ? group.tier : 0;
}
