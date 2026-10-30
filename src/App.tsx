import React, { useState } from 'react';
import { Header } from './components/Header';
import { CodeComparisonWorkspace } from './components/CodeComparisonWorkspace';
import { CategorySummaryGrid } from './components/CategorySummaryGrid';
import { IssueBreakdownList } from './components/IssueBreakdownList';
import { SAMPLE_SNIPPETS } from './config/sampleSnippets';
import { SITE_CONFIG } from './config/siteConfig';
import { analyzeAndRemediate } from './engine/auditor';
import { CategoryId, ComparisonReport, SampleSnippet, SeverityLevel } from './types/accessibility';

export const App: React.FC = () => {
  const [code, setCode] = useState<string>(SAMPLE_SNIPPETS[0].code);
  const [activePresetId, setActivePresetId] = useState<string | null>(SAMPLE_SNIPPETS[0].id);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'all'>('all');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setActivePresetId(null);
    setComparison(null); // Reset analysis state on any code change
  };

  const handleSelectPreset = (preset: SampleSnippet) => {
    setCode(preset.code);
    setActivePresetId(preset.id);
    setComparison(null); // Reset analysis state when switching preset
  };

  const handleAnalyze = () => {
    const report = analyzeAndRemediate(code);
    setComparison(report);
  };

  const handleApplyRemediated = (remediatedCode: string) => {
    setCode(remediatedCode);
    setActivePresetId(null);
    setComparison(null); // Reset analysis state after applying to input
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-stone-200">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <CodeComparisonWorkspace
          code={code}
          comparison={comparison}
          activePresetId={activePresetId}
          onCodeChange={handleCodeChange}
          onSelectPreset={handleSelectPreset}
          onAnalyze={handleAnalyze}
          onApplyRemediated={handleApplyRemediated}
        />

        <CategorySummaryGrid
          comparison={comparison}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <IssueBreakdownList
          comparison={comparison}
          selectedCategory={selectedCategory}
          selectedSeverity={selectedSeverity}
          onSelectCategory={setSelectedCategory}
          onSelectSeverity={setSelectedSeverity}
        />
      </main>

      <footer className="bg-white border-t border-stone-200 py-6 text-stone-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {SITE_CONFIG.branding.name} &bull; ขับเคลื่อนด้วยมาตรฐาน WCAG 2.1 / 2.2 Guidelines
          </p>
          <p className="text-stone-400">
            Client-Side Deterministic Accessibility Engine &bull; Zero Server Dependencies
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
