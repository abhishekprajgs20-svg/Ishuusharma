import { FileText, Layers, Palette, LayoutGrid, BookOpen, Settings2, Sparkles, Presentation } from 'lucide-react';

export type PanelKey = 'meta' | 'branding' | 'sections' | 'questions' | 'layout' | 'pages' | 'ai-prompt' | 'slides';

export const PANELS: { key: PanelKey; label: string; shortLabel: string; icon: typeof FileText }[] = [
  { key: 'questions', label: 'Questions', shortLabel: 'Questions', icon: BookOpen },
  { key: 'ai-prompt', label: 'AI Prompt Builder', shortLabel: 'AI Prompt', icon: Sparkles },
  { key: 'sections', label: 'Sections', shortLabel: 'Sections', icon: Layers },
  { key: 'meta', label: 'Test Details', shortLabel: 'Details', icon: FileText },
  { key: 'branding', label: 'Branding', shortLabel: 'Brand', icon: Palette },
  { key: 'layout', label: 'Layout & Style', shortLabel: 'Layout', icon: LayoutGrid },
  { key: 'slides', label: 'Slide PDF', shortLabel: 'Slides', icon: Presentation },
  { key: 'pages', label: 'Cover / End Pages', shortLabel: 'Pages', icon: Settings2 },
];
