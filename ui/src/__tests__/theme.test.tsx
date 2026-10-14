import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { applyThemeToDom } from '../hooks/useTheme';
import { ThemeSettingsView } from '../components/settings/ThemeSettingsView';
import { ThemeNotificationToast } from '../components/navigation/ThemeNotificationToast';
import { UiThemeConfig } from '../types';

describe('Theme System & UI Customization Tests', () => {
  const mockTheme: UiThemeConfig = {
    mode: 'dark',
    preset: 'syndae_dark',
    accent_color: '#10b981',
    bg_shade: 'midnight',
    border_radius: 'rounded',
    font_family: 'sans',
    bubble_style: 'modern',
    density: 'comfortable',
    agent_can_adjust: true,
    updated_by: 'user',
    change_reason: undefined,
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applyThemeToDom applies CSS variables to document root', () => {
    applyThemeToDom(mockTheme);
    const root = document.documentElement;

    expect(root.style.getPropertyValue('--theme-accent')).toBe('#10b981');
    expect(root.style.getPropertyValue('--theme-bg-950')).toBe('#090b10');
    expect(root.style.getPropertyValue('--theme-radius')).toBe('0.625rem');
    expect(root.getAttribute('data-theme-mode')).toBe('dark');
    expect(root.getAttribute('data-theme-bubble')).toBe('modern');
  });

  it('ThemeSettingsView renders preset options and allows preset switching', () => {
    const handleUpdate = vi.fn();
    const handleReset = vi.fn();
    const handleUndo = vi.fn();

    render(
      <ThemeSettingsView
        theme={mockTheme}
        canUndo={true}
        onUpdateTheme={handleUpdate}
        onResetTheme={handleReset}
        onUndoTheme={handleUndo}
      />
    );

    expect(screen.getByText('Curated Theme Presets')).toBeInTheDocument();
    expect(screen.getByText('Cyber Neon')).toBeInTheDocument();
    expect(screen.getByText('Tokyo Night')).toBeInTheDocument();

    // Click on Cyber Neon preset card
    const cyberBtn = screen.getByText('Cyber Neon').closest('button');
    expect(cyberBtn).toBeInTheDocument();
    fireEvent.click(cyberBtn!);

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'cyber_neon',
        accent_color: '#06b6d4',
        bg_shade: 'oled',
      })
    );
  });

  it('ThemeSettingsView allows toggling agent theme autonomy', () => {
    const handleUpdate = vi.fn();

    render(
      <ThemeSettingsView
        theme={mockTheme}
        canUndo={false}
        onUpdateTheme={handleUpdate}
        onResetTheme={vi.fn()}
        onUndoTheme={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(handleUpdate).toHaveBeenCalledWith({ agent_can_adjust: false });
  });

  it('ThemeSettingsView requires confirmation before resetting to factory defaults', () => {
    const handleReset = vi.fn();

    render(
      <ThemeSettingsView
        theme={mockTheme}
        canUndo={true}
        onUpdateTheme={vi.fn()}
        onResetTheme={handleReset}
        onUndoTheme={vi.fn()}
      />
    );

    const resetBtn = screen.getByText('Reset to Factory');
    fireEvent.click(resetBtn);

    expect(handleReset).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm Reset')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm Reset'));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('ThemeNotificationToast renders notification when Syndae personalizes theme and triggers undo', () => {
    const handleUndo = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <ThemeNotificationToast
        notification={{ preset: 'cyber_neon', reason: 'matched your nighttime reading request' }}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByText('Theme Personalized')).toBeInTheDocument();
    expect(screen.getByText(/matched your nighttime reading request/)).toBeInTheDocument();

    const undoBtn = screen.getByText('Undo Change');
    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });
});
