'use client';

import type { PanelKey } from './panels';
import MetaPanel from './panels/MetaPanel';
import BrandingPanel from './panels/BrandingPanel';
import SectionsPanel from './panels/SectionsPanel';
import QuestionsPanel from './panels/QuestionsPanel';
import LayoutPanel from './panels/LayoutPanel';
import PagesPanel from './panels/PagesPanel';
import PromptBuilderPanel from './panels/PromptBuilderPanel';
import SlideSettingsPanel from './panels/SlideSettingsPanel';

export default function PanelHost({
  activePanel,
  onSelectPanel,
}: {
  activePanel: PanelKey;
  onSelectPanel: (p: PanelKey) => void;
}) {
  return (
    <div className="p-4 md:p-5 pb-24 md:pb-8 animate-fade-in" key={activePanel}>
      {activePanel === 'meta' && <MetaPanel />}
      {activePanel === 'branding' && <BrandingPanel />}
      {activePanel === 'sections' && <SectionsPanel onGoToQuestions={() => onSelectPanel('questions')} />}
      {activePanel === 'questions' && <QuestionsPanel />}
      {activePanel === 'layout' && <LayoutPanel />}
      {activePanel === 'pages' && <PagesPanel />}
      {activePanel === 'ai-prompt' && <PromptBuilderPanel />}
      {activePanel === 'slides' && <SlideSettingsPanel />}
    </div>
  );
}
