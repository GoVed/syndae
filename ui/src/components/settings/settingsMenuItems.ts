import {
  Cpu,
  BookOpen,
  Layers,
  Activity,
  Shield,
  KeyRound,
  Sparkles,
  Palette,
} from 'lucide-react';
import { UiThemeConfig, McpTool } from '../../types';

interface MenuItemsArgs {
  activeModel: string;
  mcpTools: McpTool[];
  cpu: number;
  memPct: number;
  tokSec: number;
  onboarded: boolean;
  theme?: UiThemeConfig;
  handleNav: (dest: 'chat' | 'models' | 'memory' | 'tools' | 'diagnostics') => void;
  setSubView: (view: 'main' | 'diagnostics' | 'password' | 'theme') => void;
  onOpenAudit?: () => void;
  onStartOnboarding?: () => void;
}

export const buildSettingsMenuItems = ({
  activeModel,
  mcpTools,
  cpu,
  memPct,
  tokSec,
  onboarded,
  theme,
  handleNav,
  setSubView,
  onOpenAudit,
  onStartOnboarding,
}: MenuItemsArgs) => [
  {
    id: 'models',
    title: 'AI Voice & Intelligence',
    subtitle: `Active: ${activeModel.split(':')[0]?.replace('QuantTrio/', '') || 'Smart Assistant'} • AI engine is running smoothly`,
    icon: Cpu,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    badge: 'Engine',
    action: () => handleNav('models'),
  },
  {
    id: 'theme',
    title: 'Appearance & UI Theme',
    subtitle: `Theme: ${theme?.preset ? theme.preset.replace('_', ' ') : 'Emerald'} • Mode: ${theme?.mode || 'dark'} • Autonomy: ${theme?.agent_can_adjust ? 'Enabled' : 'Locked'}`,
    icon: Palette,
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    badge: 'Theme',
    action: () => setSubView('theme'),
  },
  {
    id: 'memory',
    title: 'Memory & What I Know About You',
    subtitle: 'Your personal preferences, learned habits, and notes',
    icon: BookOpen,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    badge: 'Memory',
    action: () => handleNav('memory'),
  },
  {
    id: 'tools',
    title: 'Connected Apps & Assistants',
    subtitle: `${mcpTools.length} connected daemon${mcpTools.length === 1 ? '' : 's'} registered in MCP tool catalog`,
    icon: Layers,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    badge: 'Apps',
    action: () => handleNav('tools'),
  },
  {
    id: 'diagnostics',
    title: 'Device Health & Performance',
    subtitle: `Processor ${cpu.toFixed(0)}% • Memory ${memPct.toFixed(0)}% • Speed: ${tokSec.toFixed(0)} words/sec`,
    icon: Activity,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    badge: 'Vitals',
    action: () => setSubView('diagnostics'),
  },
  {
    id: 'security',
    title: 'Privacy & Safety Approvals',
    subtitle: 'Safe Mode Active: Syndae always asks your permission before sending anything',
    icon: Shield,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    badge: 'Safe',
    action: () => (onOpenAudit ? onOpenAudit() : handleNav('chat')),
  },
  {
    id: 'password',
    title: 'Master Access Key & Password',
    subtitle: 'Change your device unlock password and manage enclave access credentials',
    icon: KeyRound,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    badge: 'Security',
    action: () => setSubView('password'),
  },
  {
    id: 'onboarding',
    title: 'Personal Setup & Preferences',
    subtitle: onboarded
      ? 'Update how Syndae talks, your daily routine, and what to remember'
      : 'Get started: Tell Syndae how you would like to be helped',
    icon: Sparkles,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    badge: onboarded ? 'Profile' : 'Setup',
    action: () => (onStartOnboarding ? onStartOnboarding() : handleNav('chat')),
  },
];
