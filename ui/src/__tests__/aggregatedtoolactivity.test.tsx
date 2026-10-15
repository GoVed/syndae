import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AggregatedToolActivity, formatToolActivity } from '../components/chat/AggregatedToolActivity';
import { ToolExecutionCard } from '../components/chat/types';

describe('AggregatedToolActivity Component Tests', () => {
  it('formats tool activity into natural human-readable descriptions', () => {
    const webSearch = formatToolActivity('web_search', { query: 'Toronto autumn colors' });
    expect(webSearch.friendlyName).toBe('Web Search');
    expect(webSearch.actionDescription).toBe('Searching the web for "Toronto autumn colors"');

    const memoryRead = formatToolActivity('read_memory', { path: '/memory/core/user_profile.md' });
    expect(memoryRead.friendlyName).toBe('Read Memory');
    expect(memoryRead.actionDescription).toContain('user_profile.md');

    const msgSend = formatToolActivity('send_message', { to: 'Sarah', message: 'Hello' });
    expect(msgSend.friendlyName).toBe('Send Message');
    expect(msgSend.actionDescription).toContain('Sarah');
  });

  it('renders aggregated single summary bar by default (collapsed for general users)', () => {
    const executions: ToolExecutionCard[] = [
      {
        id: '1',
        tool_name: 'web_search',
        arguments: { query: 'Toronto autumn scenes' },
        status: 'completed',
        output: 'Found 3 photos',
      },
      {
        id: '2',
        tool_name: 'read_web_page',
        arguments: { url: 'https://unsplash.com/s/photos/autumn' },
        status: 'running',
      },
    ];

    render(<AggregatedToolActivity executions={executions} />);

    // Active tool description should be front and center for general users
    expect(screen.getByText(/Reading webpage on unsplash.com/i)).toBeDefined();
    // Progress counter shows completed / total
    expect(screen.getByText('2/2')).toBeDefined();
    // Timeline steps should NOT be visible by default
    expect(screen.queryByText(/Query: "Toronto autumn scenes"/i)).toBeNull();
  });

  it('expands detailed timeline when header is clicked', () => {
    const executions: ToolExecutionCard[] = [
      {
        id: '1',
        tool_name: 'web_search',
        arguments: { query: 'Toronto autumn scenes' },
        status: 'completed',
        output: 'Found 3 photos',
      },
    ];

    render(<AggregatedToolActivity executions={executions} />);

    // Click the summary header to expand
    const header = screen.getByRole('button');
    fireEvent.click(header);

    // Timeline step details should now be visible
    expect(screen.getByText(/Query: "Toronto autumn scenes"/i)).toBeDefined();
    expect(screen.getByText('web_search')).toBeDefined();

    // Toggle raw developer parameters
    const rawToggle = screen.getByText(/Show raw parameters & output/i);
    fireEvent.click(rawToggle);

    expect(screen.getByText('Found 3 photos')).toBeDefined();
    expect(screen.getByText(/Hide raw parameters & output/i)).toBeDefined();
  });
});
