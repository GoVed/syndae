import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionSidebar } from '../components/chat/SessionSidebar';
import { ChatSession } from '../types';

describe('SessionSidebar component tests', () => {
  const now = new Date();
  const todayStr = now.toISOString();
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString();
  const thisWeekStr = new Date(Date.now() - 3 * 86400000).toISOString();
  const thirtyDaysStr = new Date(Date.now() - 15 * 86400000).toISOString();

  const mockSessions: ChatSession[] = [
    { id: '1', title: 'Today Chat 1', mode: 'chat', created_at: todayStr, updated_at: todayStr },
    { id: '2', title: 'Yesterday Chat', mode: 'chat', created_at: yesterdayStr, updated_at: yesterdayStr },
    { id: '3', title: 'This Week Chat', mode: 'chat', created_at: thisWeekStr, updated_at: thisWeekStr },
    { id: '4', title: 'Older Chat 30d', mode: 'chat', created_at: thirtyDaysStr, updated_at: thirtyDaysStr },
  ];

  it('renders Today, Yesterday, and This Week by default, with More chats button', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        activeSession={mockSessions[0]}
        mobileSidebarOpen={false}
        onSelectSession={() => {}}
        onCreateSession={() => {}}
        onDeleteSession={() => {}}
        onCloseMobileSidebar={() => {}}
      />
    );

    // Today, Yesterday, This Week section headers
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('This Week')).toBeDefined();

    // Session titles
    expect(screen.getByText('Today Chat 1')).toBeDefined();
    expect(screen.getByText('Yesterday Chat')).toBeDefined();
    expect(screen.getByText('This Week Chat')).toBeDefined();

    // Older chat should NOT be visible yet
    expect(screen.queryByText('Older Chat 30d')).toBeNull();

    // "More chats" button should be displayed
    const moreBtn = screen.getByText(/More chats/i);
    expect(moreBtn).toBeDefined();

    // Click "More chats" button
    fireEvent.click(moreBtn);

    // Now Older Chat 30d is visible under Previous 30 Days
    expect(screen.getByText('Older Chat 30d')).toBeDefined();
    expect(screen.getByText('Previous 30 Days')).toBeDefined();
  });

  it('allows collapsing and expanding a section', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        activeSession={mockSessions[0]} // Active session in Today
        mobileSidebarOpen={false}
        onSelectSession={() => {}}
        onCreateSession={() => {}}
        onDeleteSession={() => {}}
        onCloseMobileSidebar={() => {}}
      />
    );

    expect(screen.getByText('Yesterday Chat')).toBeDefined();

    // Click Yesterday section header to collapse
    const yesterdayHeader = screen.getByText('Yesterday');
    fireEvent.click(yesterdayHeader);

    // Session is hidden
    expect(screen.queryByText('Yesterday Chat')).toBeNull();

    // Click again to expand
    fireEvent.click(yesterdayHeader);
    expect(screen.getByText('Yesterday Chat')).toBeDefined();
  });

  it('auto-expands tier if active session is in an older tier', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        activeSession={mockSessions[3]} // Active session in Previous 30 Days
        mobileSidebarOpen={false}
        onSelectSession={() => {}}
        onCreateSession={() => {}}
        onDeleteSession={() => {}}
        onCloseMobileSidebar={() => {}}
      />
    );

    // Older Chat 30d is automatically visible because it is the activeSession!
    expect(screen.getByText('Older Chat 30d')).toBeDefined();
    expect(screen.getByText('Previous 30 Days')).toBeDefined();
  });
});
