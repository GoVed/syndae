import React from 'react';
import { Palette, RotateCcw, X, Sliders } from 'lucide-react';

interface ThemeNotificationToastProps {
  notification: { preset: string; reason?: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
  onOpenSettings?: () => void;
}

export const ThemeNotificationToast: React.FC<ThemeNotificationToastProps> = ({
  notification,
  onUndo,
  onDismiss,
  onOpenSettings,
}) => {
  if (!notification) return null;

  const presetName = notification.preset.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <aside
      aria-label="Theme Adjustment Notification"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-syndae-900/95 backdrop-blur-md border border-syndae-750 p-3.5 rounded-xl shadow-2xl shadow-black/60 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-syndae-accent/15 text-syndae-accent">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-syndae-accent">
              Theme Personalized
            </div>
            <div className="text-sm font-medium text-white">
              Syndae adjusted theme to <span className="text-syndae-accent font-semibold">{presetName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {notification.reason && (
        <p className="text-xs text-slate-300 italic pl-1 border-l-2 border-syndae-accent/40">
          "{notification.reason}"
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-syndae-800">
        {onOpenSettings && (
          <button
            onClick={() => {
              onDismiss();
              onOpenSettings();
            }}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-syndae-800 rounded flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Customize
          </button>
        )}
        <button
          onClick={onUndo}
          className="px-3 py-1 text-xs font-medium bg-syndae-800 hover:bg-syndae-750 text-white rounded flex items-center gap-1.5 transition-colors border border-syndae-700"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          Undo Change
        </button>
      </div>
    </aside>
  );
};
