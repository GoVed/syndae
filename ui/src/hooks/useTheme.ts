import { useState, useEffect, useCallback, useRef } from 'react';
import { UiThemeConfig } from '../types';

export const THEME_PRESETS: Record<string, { label: string; accent: string; bg: UiThemeConfig['bg_shade']; description: string }> = {
  syndae_dark: { label: 'Syndae Emerald', accent: '#10b981', bg: 'midnight', description: 'Classic Syndae dark palette with emerald accents' },
  cyber_neon: { label: 'Cyber Neon', accent: '#06b6d4', bg: 'oled', description: 'Deep OLED pitch black with vibrant cyan highlights' },
  tokyo_night: { label: 'Tokyo Night', accent: '#818cf8', bg: 'navy', description: 'Deep indigo sci-fi night with neon violet accents' },
  nordic_frost: { label: 'Nordic Frost', accent: '#38bdf8', bg: 'slate', description: 'Clean slate tones with cool arctic ice blue' },
  amber_glow: { label: 'Amber Glow', accent: '#f59e0b', bg: 'charcoal', description: 'Warm charcoal surfaces with glowing amber accents' },
  rose_quartz: { label: 'Rose Quartz', accent: '#f43f5e', bg: 'zinc', description: 'Modern neutral zinc with radiant rose highlights' },
  emerald_matrix: { label: 'Emerald Matrix', accent: '#22c55e', bg: 'oled', description: 'Pure black terminal with matrix green glow' },
  monochrome_oled: { label: 'OLED Silver', accent: '#e2e8f0', bg: 'oled', description: 'True monochrome black with crisp silver accents' },
  solarized_dark: { label: 'Solarized Dark', accent: '#2aa198', bg: 'navy', description: 'Classic developer solarized palette with cyan' },
};

export const BG_PALETTES: Record<string, Record<string, string>> = {
  midnight: {
    '--theme-bg-950': '#090b10', '--theme-bg-900': '#0f121b', '--theme-bg-850': '#151926',
    '--theme-bg-800': '#1d2335', '--theme-bg-750': '#252c42', '--theme-bg-700': '#2f3854',
    '--theme-bg-600': '#414c72', '--theme-bg-500': '#5a6898',
  },
  oled: {
    '--theme-bg-950': '#000000', '--theme-bg-900': '#0a0a0a', '--theme-bg-850': '#121212',
    '--theme-bg-800': '#1a1a1a', '--theme-bg-750': '#242424', '--theme-bg-700': '#2e2e2e',
    '--theme-bg-600': '#404040', '--theme-bg-500': '#525252',
  },
  navy: {
    '--theme-bg-950': '#0a0e1a', '--theme-bg-900': '#10162a', '--theme-bg-850': '#18203c',
    '--theme-bg-800': '#222b4c', '--theme-bg-750': '#2c375e', '--theme-bg-700': '#394776',
    '--theme-bg-600': '#4a5b94', '--theme-bg-500': '#6174b5',
  },
  slate: {
    '--theme-bg-950': '#0b0f17', '--theme-bg-900': '#111827', '--theme-bg-850': '#1f2937',
    '--theme-bg-800': '#374151', '--theme-bg-750': '#4b5563', '--theme-bg-700': '#6b7280',
    '--theme-bg-600': '#9ca3af', '--theme-bg-500': '#d1d5db',
  },
  charcoal: {
    '--theme-bg-950': '#121110', '--theme-bg-900': '#1c1a17', '--theme-bg-850': '#272421',
    '--theme-bg-800': '#34302c', '--theme-bg-750': '#443f3a', '--theme-bg-700': '#554f49',
    '--theme-bg-600': '#6d665f', '--theme-bg-500': '#878078',
  },
  zinc: {
    '--theme-bg-950': '#09090b', '--theme-bg-900': '#18181b', '--theme-bg-850': '#27272a',
    '--theme-bg-800': '#3f3f46', '--theme-bg-750': '#52525b', '--theme-bg-700': '#71717a',
    '--theme-bg-600': '#a1a1aa', '--theme-bg-500': '#d4d4d8',
  },
};

export const LIGHT_PALETTE: Record<string, string> = {
  '--theme-bg-950': '#f8fafc', '--theme-bg-900': '#f1f5f9', '--theme-bg-850': '#e2e8f0',
  '--theme-bg-800': '#cbd5e1', '--theme-bg-750': '#94a3b8', '--theme-bg-700': '#64748b',
  '--theme-bg-600': '#475569', '--theme-bg-500': '#334155',
};

export const applyThemeToDom = (config: UiThemeConfig) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isLight = config.mode === 'light';
  const palette = isLight ? LIGHT_PALETTE : (BG_PALETTES[config.bg_shade] || BG_PALETTES.midnight);

  Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--theme-accent', config.accent_color);
  root.style.setProperty('--theme-accent-hover', config.accent_color);
  root.style.setProperty('--theme-accent-light', config.accent_color);
  root.style.setProperty('--theme-accent-glow', `${config.accent_color}26`);

  const radiusMap: Record<string, string> = { sharp: '0.25rem', rounded: '0.625rem', curved: '1rem' };
  root.style.setProperty('--theme-radius', radiusMap[config.border_radius] || '0.625rem');

  const fontMap: Record<string, string> = {
    sans: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", Menlo, monospace',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  };
  root.style.setProperty('--theme-font', fontMap[config.font_family] || fontMap.sans);

  root.setAttribute('data-theme-mode', config.mode);
  root.setAttribute('data-theme-bubble', config.bubble_style);
  root.setAttribute('data-theme-density', config.density);
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<UiThemeConfig>({
    mode: 'dark', preset: 'syndae_dark', accent_color: '#10b981', bg_shade: 'midnight',
    border_radius: 'rounded', font_family: 'sans', bubble_style: 'modern', density: 'comfortable',
    agent_can_adjust: true, updated_by: 'user', change_reason: undefined, updated_at: new Date().toISOString(),
  });
  const [canUndo, setCanUndo] = useState(false);
  const [agentNotification, setAgentNotification] = useState<{ preset: string; reason?: string } | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/theme');
      if (res.ok) {
        const data = await res.json();
        if (data.theme) {
          setThemeState(data.theme);
          setCanUndo(!!data.can_undo);
          applyThemeToDom(data.theme);
        }
      }
    } catch (e) {
      console.warn('Could not load theme settings, using defaults', e);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchTheme();
    }
  }, [fetchTheme]);

  const updateTheme = useCallback(async (partial: Partial<UiThemeConfig>) => {
    const updated: UiThemeConfig = { ...theme, ...partial, updated_by: 'user', updated_at: new Date().toISOString() };
    setThemeState(updated);
    applyThemeToDom(updated);
    try {
      const res = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.theme) {
          setThemeState(data.theme);
          setCanUndo(true);
        }
      }
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  }, [theme]);

  const resetTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/theme/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.theme) {
          setThemeState(data.theme);
          applyThemeToDom(data.theme);
          setCanUndo(true);
        }
      }
    } catch (e) {
      console.error('Failed to reset theme', e);
    }
  }, []);

  const undoTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/theme/undo', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.theme) {
          setThemeState(data.theme);
          applyThemeToDom(data.theme);
          setCanUndo(!!data.can_undo);
          setAgentNotification(null);
        }
      }
    } catch (e) {
      console.error('Failed to undo theme', e);
    }
  }, []);

  const handleRemoteThemeUpdate = useCallback((newTheme: UiThemeConfig) => {
    setThemeState(newTheme);
    applyThemeToDom(newTheme);
    setCanUndo(true);
    if (newTheme.updated_by === 'syndae') {
      setAgentNotification({ preset: newTheme.preset, reason: newTheme.change_reason });
    }
  }, []);

  const dismissAgentNotification = useCallback(() => {
    setAgentNotification(null);
  }, []);

  return {
    theme,
    canUndo,
    agentNotification,
    updateTheme,
    resetTheme,
    undoTheme,
    handleRemoteThemeUpdate,
    dismissAgentNotification,
  };
};
