import React, { useState } from 'react';
import { Copy, Check, ArrowRightLeft, Play, Code2, AlertTriangle } from 'lucide-react';
import { ComparisonReport, SampleSnippet, SyntaxMode } from '../types/accessibility';
import { SAMPLE_SNIPPETS } from '../config/sampleSnippets';
import { StarRating } from './StarRating';
import { detectSyntaxMode } from '../engine/jsxNormalizer';

export interface CodeComparisonWorkspaceProps {
  code: string;
  comparison: ComparisonReport | null;
  activePresetId: string | null;
  onCodeChange: (newCode: string) => void;
  onSelectPreset: (preset: SampleSnippet) => void;
  onAnalyze: () => void;
  onApplyRemediated: (remediatedCode: string) => void;
}

export const CodeComparisonWorkspace: React.FC<CodeComparisonWorkspaceProps> = ({
  code,
  comparison,
  activePresetId,
  onCodeChange,
  onSelectPreset,
  onAnalyze,
  onApplyRemediated,
}) => {
  const [copied, setCopied] = useState(false);
  const isAnalyzed = comparison !== null;
  const syntaxMode: SyntaxMode = detectSyntaxMode(code);

  const inputLines = code.split('\n');
  const remediatedLines = comparison ? comparison.remediatedCode.split('\n') : [];

  const issueLineNumbers = React.useMemo(() => {
    if (!comparison) return new Set<number>();
    return new Set(comparison.originalReport.issues.map((issue) => issue.line));
  }, [comparison]);

  const handleCopy = async () => {
    if (!comparison?.remediatedCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(comparison.remediatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard failure safe guard
      }
    }
  };

  const handleApply = () => {
    if (comparison?.remediatedCode) {
      onApplyRemediated(comparison.remediatedCode);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset Buttons Bar */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 mr-1 uppercase tracking-wide">
            ชุดตัวอย่างโค้ด:
          </span>
          {SAMPLE_SNIPPETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-btn-${preset.id}`}
                onClick={() => onSelectPreset(preset)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-stone-500 hidden sm:block">
          {SAMPLE_SNIPPETS.find((s) => s.id === activePresetId)?.description || 'เลือกตัวอย่างเพื่อเริ่มต้น'}
        </div>
      </div>

      {/* Split Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Original Code Input */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col h-[520px]">
          {/* Header Bar */}
          <div className="px-4 py-3 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2 bg-stone-50/60 rounded-t-xl">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-stone-900 text-sm">
                โค้ดต้นฉบับ (Original Code)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium uppercase bg-stone-200 text-stone-700">
                {syntaxMode.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span
                data-testid="before-score-value"
                className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-stone-800 border border-stone-200 shadow-2xs"
              >
                {isAnalyzed ? `${comparison.originalReport.scoreResult.score} / 100` : '- / 100'}
              </span>
              <span
                data-testid="before-grade-value"
                className="text-xs font-medium px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200 shadow-2xs"
              >
                {isAnalyzed
                  ? `เกรด ${comparison.originalReport.scoreResult.grade} (${comparison.originalReport.scoreResult.stars} ดาว)`
                  : 'เกรด - (- ดาว)'}
              </span>
              <StarRating
                stars={isAnalyzed ? comparison.originalReport.scoreResult.stars : null}
                size="sm"
              />
            </div>
          </div>

          {/* Editor Area with Line Numbers */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs sm:text-sm">
            {/* Gutter / Line Numbers */}
            <div className="w-11 bg-stone-50 border-r border-stone-200 py-3 select-none flex flex-col items-end pr-2 text-stone-400 font-mono text-xs leading-6 overflow-hidden">
              {inputLines.map((_, index) => {
                const lineNum = index + 1;
                const hasIssue = issueLineNumbers.has(lineNum);
                return (
                  <div
                    key={index}
                    className={`h-6 flex items-center justify-end w-full ${
                      hasIssue ? 'text-rose-600 font-bold bg-rose-50 -mr-2 pr-2 rounded-l' : ''
                    }`}
                    title={hasIssue ? `พบบกพร่องในบรรทัดที่ ${lineNum}` : undefined}
                  >
                    {hasIssue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1" />}
                    <span>{lineNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Input Textarea */}
            <textarea
              data-testid="code-input-textarea"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="วาง HTML หรือ JSX markup ของคุณที่นี่..."
              spellCheck={false}
              className="flex-1 p-3 bg-white text-stone-900 font-mono text-xs sm:text-sm leading-6 resize-none focus:outline-hidden focus:ring-1 focus:ring-stone-400 overflow-auto whitespace-pre"
            />
          </div>

          {/* Bottom Bar: Action Button */}
          <div className="p-3 border-t border-stone-100 bg-stone-50/60 rounded-b-xl flex items-center justify-between">
            <div className="text-xs text-stone-500 flex items-center space-x-1">
              {isAnalyzed && comparison.originalReport.issues.length > 0 ? (
                <span className="flex items-center text-rose-600 font-medium space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  พบ {comparison.originalReport.issues.length} ประเด็นที่ต้องแก้ไข
                </span>
              ) : isAnalyzed ? (
                <span className="text-emerald-600 font-medium">ไม่พบข้อบกพร่องตามเกณฑ์ WCAG</span>
              ) : (
                <span>แก้ไขโค้ดหรือเลือกตัวอย่างแล้วกดปุ่มวิเคราะห์</span>
              )}
            </div>

            <button
              type="button"
              data-testid="analyze-button"
              onClick={onAnalyze}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-xs sm:text-sm flex items-center space-x-1.5 transition-colors shadow-xs active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>วิเคราะห์และสร้างโค้ดแก้ไข</span>
            </button>
          </div>
        </div>

        {/* Right Column: Remediated Code Output */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col h-[520px]">
          {/* Header Bar */}
          <div className="px-4 py-3 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2 bg-stone-50/60 rounded-t-xl">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-stone-900 text-sm">
                โค้ดหลังแก้ไข (Remediated Code)
              </span>
              {isAnalyzed && (
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {comparison.remediatedReport.syntaxMode.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span
                data-testid="after-score-value"
                className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                {isAnalyzed ? `${comparison.remediatedReport.scoreResult.score} / 100` : '- / 100'}
              </span>
              <span
                data-testid="after-grade-value"
                className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
              >
                {isAnalyzed
                  ? `เกรด ${comparison.remediatedReport.scoreResult.grade} (${comparison.remediatedReport.scoreResult.stars} ดาว)`
                  : 'เกรด - (- ดาว)'}
              </span>
              <StarRating
                stars={isAnalyzed ? comparison.remediatedReport.scoreResult.stars : null}
                size="sm"
              />
              {isAnalyzed && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  +{comparison.scoreDelta} คะแนน
                </span>
              )}
            </div>
          </div>

          {/* Viewer Area / Placeholder */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs sm:text-sm bg-stone-900 text-stone-100">
            {isAnalyzed ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Gutter / Line Numbers */}
                <div className="w-11 bg-stone-950 border-r border-stone-800 py-3 select-none flex flex-col items-end pr-2 text-stone-500 font-mono text-xs leading-6 overflow-hidden">
                  {remediatedLines.map((_, index) => (
                    <div key={index} className="h-6 flex items-center justify-end w-full">
                      <span>{index + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Remediated Code Box */}
                <pre
                  data-testid="remediated-code-box"
                  className="flex-1 p-3 font-mono text-xs sm:text-sm leading-6 overflow-auto whitespace-pre text-emerald-300"
                >
                  <code>{comparison.remediatedCode}</code>
                </pre>
              </div>
            ) : (
              <div
                data-testid="remediated-code-box"
                className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-stone-900"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center mb-3 text-stone-400">
                  <Code2 className="w-6 h-6" />
                </div>
                <p className="font-medium text-stone-200 text-sm">ยังไม่มีผลลัพธ์การแก้ไข</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm">
                  กดปุ่ม "วิเคราะห์และสร้างโค้ดแก้ไข" เพื่อสร้างโค้ดใหม่ที่ปฏิบัติตามมาตรฐาน WCAG อัตโนมัติ
                </p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Action Buttons */}
          <div className="p-3 border-t border-stone-100 bg-stone-50/60 rounded-b-xl flex items-center justify-between">
            <div className="text-xs text-stone-500">
              {isAnalyzed && (
                <span>แก้ไขและปรับปรุงสำเร็จตามมาตรฐาน WCAG 2.1 / 2.2</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                data-testid="copy-remediated-button"
                onClick={handleCopy}
                disabled={!isAnalyzed}
                className={`px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors border ${
                  isAnalyzed
                    ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200 shadow-2xs active:scale-98'
                    : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" />
                    <span>คัดลอกโค้ดที่แก้ไขแล้ว</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="apply-remediated-button"
                onClick={handleApply}
                disabled={!isAnalyzed}
                className={`px-3 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-colors border ${
                  isAnalyzed
                    ? 'bg-stone-900 hover:bg-stone-800 text-white border-stone-900 shadow-2xs active:scale-98'
                    : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>แทนที่ลงในช่อง Input</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
