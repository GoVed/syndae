import React, { useState } from 'react';
import {
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Check,
  Undo2,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { UiThemeConfig } from '../../types';
import { THEME_PRESETS, BG_PALETTES } from '../../hooks/useTheme';

interface ThemeSettingsViewProps {
  theme: UiThemeConfig;
  canUndo: boolean;
  onUpdateTheme: (partial: Partial<UiThemeConfig>) => void;
  onResetTheme: () => void;
  onUndoTheme: () => void;
}

const ACCENT_SWATCHES = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan Neon', hex: '#06b6d4' },
  { name: 'Ice Blue', hex: '#38bdf8' },
  { name: 'Indigo Neon', hex: '#818cf8' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Sunset Rose', hex: '#f43f5e' },
  { name: 'Matrix Green', hex: '#22c55e' },
  { name: 'Crisp Silver', hex: '#e2e8f0' },
];

const BG_SHADES: { id: UiThemeConfig['bg_shade']; label: string; desc: string; sample: string }[] = [
  { id: 'midnight', label: 'Midnight', desc: 'Classic deep navy-black', sample: '#090b10' },
  { id: 'oled', label: 'OLED Pure Black', desc: 'Pitch black for OLED screens', sample: '#000000' },
  { id: 'navy', label: 'Deep Indigo', desc: 'Tokyo sci-fi navy hue', sample: '#0a0e1a' },
  { id: 'slate', label: 'Nordic Slate', desc: 'Modern cool graphite', sample: '#0b0f17' },
  { id: 'charcoal', label: 'Warm Charcoal', desc: 'Cozy warm undertone', sample: '#121110' },
  { id: 'zinc', label: 'Neutral Zinc', desc: 'High-tech neutral dark', sample: '#09090b' },
];

export const ThemeSettingsView: React.FC<ThemeSettingsViewProps> = ({
  theme,
  canUndo,
  onUpdateTheme,
  onResetTheme,
  onUndoTheme,
}) => {
  const [customHex, setCustomHex] = useState(theme.accent_color);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  const handleCustomHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9a-fA-F]{6}$/i.test(customHex.trim())) {
      onUpdateTheme({ accent_color: customHex.trim(), preset: 'custom' });
    }
  };

  const currentPresetLabel = THEME_PRESETS[theme.preset]?.label || 'Custom Palette';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Live Preview */}
      <div className="bg-syndae-900 border border-syndae-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform"
            style={{ backgroundColor: `${theme.accent_color}22`, border: `1.5px solid ${theme.accent_color}66` }}
          >
            <Palette className="w-6 h-6" style={{ color: theme.accent_color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{currentPresetLabel}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-syndae-800 text-slate-300 border border-syndae-700">
                {theme.mode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized {theme.updated_by === 'syndae' ? 'autonomously by Syndae' : 'by you'} •{' '}
              {theme.change_reason ? `"${theme.change_reason}"` : 'Safe contrast enforced'}
            </p>
          </div>
        </div>

        {/* Action Controls: Undo & Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onUndoTheme}
            disabled={!canUndo}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
              canUndo
                ? 'bg-syndae-800 hover:bg-syndae-750 text-white border border-syndae-700 shadow-sm'
                : 'opacity-40 cursor-not-allowed bg-syndae-900 text-slate-500 border border-syndae-850'
            }`}
            title="Revert to previous theme state"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-400" />
            Undo
          </button>

          {resetConfirmed ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onResetTheme();
                  setResetConfirmed(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-sm"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setResetConfirmed(false)}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirmed(true)}
              className="px-3 py-1.5 text-xs font-medium bg-syndae-800 hover:bg-syndae-750 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors border border-syndae-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Factory
            </button>
          )}
        </div>
      </div>

      {/* 2. Agent Theme Autonomy Guard */}
      <div className="bg-syndae-900/60 border border-syndae-800/80 rounded-xl p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Agent Theme Autonomy</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Allow Syndae to automatically suit the environment to your preferences, mood, or time of day.
              Every change is strictly contrast-tested and protected with 1-click Undo.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={theme.agent_can_adjust}
            onChange={e => onUpdateTheme({ agent_can_adjust: e.target.checked })}
          />
          <div className="w-10 h-5 bg-syndae-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-syndae-accent" />
        </label>
      </div>

      {/* 3. Curated Presets Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5" /> Curated Theme Presets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => {
            const isSelected = theme.preset === key;
            return (
              <button
                key={key}
                onClick={() =>
                  onUpdateTheme({
                    preset: key,
                    accent_color: preset.accent,
                    bg_shade: preset.bg,
                    mode: 'dark',
                  })
                }
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24 ${
                  isSelected
                    ? 'bg-syndae-850 border-syndae-accent shadow-md shadow-syndae-accent/10 ring-1 ring-syndae-accent/40'
                    : 'bg-syndae-900 border-syndae-800 hover:border-syndae-700 hover:bg-syndae-850/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: preset.accent }}
                    />
                    <span className="text-xs font-bold text-white tracking-tight">{preset.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-syndae-accent" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Accent Colors Palette */}
      <div className="bg-syndae-900 border border-syndae-800 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Accent & Highlights</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          {ACCENT_SWATCHES.map(swatch => {
            const isCurrent = theme.accent_color.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.hex}
                onClick={() => onUpdateTheme({ accent_color: swatch.hex, preset: 'custom' })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isCurrent ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              >
                {isCurrent && <Check className="w-4 h-4 text-black font-black drop-shadow" />}
              </button>
            );
          })}

          {/* Custom Hex input */}
          <form onSubmit={handleCustomHexSubmit} className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={customHex}
              onChange={e => setCustomHex(e.target.value)}
              placeholder="#10b981"
              maxLength={7}
              className="w-24 px-2 py-1 text-xs bg-syndae-950 border border-syndae-750 rounded-lg text-white font-mono focus:outline-none focus:border-syndae-accent"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-medium bg-syndae-800 hover:bg-syndae-700 text-slate-200 rounded-lg transition-colors border border-syndae-750"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* 5. Background Tone & Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Background Tone */}
        <div className="bg-syndae-900 border border-syndae-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Background Palette Tone</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BG_SHADES.map(b => (
              <button
                key={b.id}
                onClick={() => onUpdateTheme({ bg_shade: b.id, preset: 'custom' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  theme.bg_shade === b.id
                    ? 'border-syndae-accent bg-syndae-800/80 shadow-sm'
                    : 'border-syndae-800 bg-syndae-950/60 hover:border-syndae-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-slate-600" style={{ backgroundColor: b.sample }} />
                  <span className="text-xs font-semibold text-white">{b.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">{b.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Styling Details: Radius, Density, Bubble */}
        <div className="bg-syndae-900 border border-syndae-800 rounded-xl p-4 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">UI Geometry & Roundness</h3>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Corner Radius:</span>
            <div className="flex items-center gap-1 bg-syndae-950 p-0.5 rounded-lg border border-syndae-800">
              {(['sharp', 'rounded', 'curved'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => onUpdateTheme({ border_radius: r })}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] font-medium transition-colors ${
                    theme.border_radius === r ? 'bg-syndae-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Spacing Density:</span>
            <div className="flex items-center gap-1 bg-syndae-950 p-0.5 rounded-lg border border-syndae-800">
              {(['compact', 'comfortable', 'spacious'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => onUpdateTheme({ density: d })}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] font-medium transition-colors ${
                    theme.density === d ? 'bg-syndae-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Theme Mode:</span>
            <div className="flex items-center gap-1 bg-syndae-950 p-0.5 rounded-lg border border-syndae-800">
              <button
                onClick={() => onUpdateTheme({ mode: 'dark' })}
                className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  theme.mode === 'dark' ? 'bg-syndae-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3" /> Dark
              </button>
              <button
                onClick={() => onUpdateTheme({ mode: 'light' })}
                className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  theme.mode === 'light' ? 'bg-syndae-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3" /> Light
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
