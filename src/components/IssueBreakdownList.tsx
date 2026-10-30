import React, { useState } from 'react';
import { Copy, Check, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CategoryId, ComparisonReport, SeverityLevel, AuditIssue } from '../types/accessibility';
import { SITE_CONFIG } from '../config/siteConfig';

export interface IssueBreakdownListProps {
  comparison: ComparisonReport | null;
  selectedCategory: CategoryId | 'all';
  selectedSeverity: SeverityLevel | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  onSelectSeverity: (sev: SeverityLevel | 'all') => void;
}

export const IssueBreakdownList: React.FC<IssueBreakdownListProps> = ({
  comparison,
  selectedCategory,
  selectedSeverity,
  onSelectCategory,
  onSelectSeverity,
}) => {
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const isAnalyzed = comparison !== null;
  const issues: AuditIssue[] = comparison ? comparison.originalReport.issues : [];

  const filteredIssues = issues.filter((issue) => {
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  const handleCopySnippet = async (issueId: string, snippet: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(snippet);
        setCopiedSnippetId(issueId);
        setTimeout(() => setCopiedSnippetId(null), 2000);
      } catch {
        // clipboard fallback
      }
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            รุนแรงมาก (-20 คะแนน)
          </span>
        );
      case 'moderate':
        return (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            ปานกลาง (-10 คะแนน)
          </span>
        );
      case 'minor':
        return (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            เล็กน้อย (-5 คะแนน)
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            รายการข้อบกพร่องที่ตรวจพบ (Detected Issues)
          </h2>
          {isAnalyzed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold border border-stone-200">
              {filteredIssues.length} / {issues.length}
            </span>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-stone-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>ตัวกรอง:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value as CategoryId | 'all')}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-stone-400"
          >
            <option value="all">ทุกหมวดหมู่</option>
            <option value="text-alt">Text Alternatives</option>
            <option value="forms">Form Controls & Labels</option>
            <option value="semantic">Semantic Structure</option>
            <option value="attributes">Attributes & Navigation</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => onSelectSeverity(e.target.value as SeverityLevel | 'all')}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-stone-400"
          >
            <option value="all">ทุกระดับความรุนแรง</option>
            <option value="critical">รุนแรงมาก (Critical)</option>
            <option value="moderate">ปานกลาง (Moderate)</option>
            <option value="minor">เล็กน้อย (Minor)</option>
          </select>

          {(selectedCategory !== 'all' || selectedSeverity !== 'all') && (
            <button
              type="button"
              onClick={() => {
                onSelectCategory('all');
                onSelectSeverity('all');
              }}
              className="text-stone-500 hover:text-stone-900 font-medium underline px-1"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* State Rendering */}
      {!isAnalyzed ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-stone-400">
          <AlertCircle className="w-10 h-10 mb-3 text-stone-400 stroke-1" />
          <p className="font-semibold text-stone-700 text-sm">ยังไม่มีผลการวิเคราะห์</p>
          <p className="text-xs text-stone-500 mt-1 max-w-md">
            กรุณากดปุ่ม "วิเคราะห์และสร้างโค้ดแก้ไข" ด้านบนเพื่อเริ่มตรวจจับข้อบกพร่องตามเกณฑ์ WCAG 2.1 / 2.2
          </p>
        </div>
      ) : issues.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-600" />
          <p className="font-bold text-stone-900 text-base">ไม่พบข้อบกพร่องด้าน Accessibility</p>
          <p className="text-xs text-emerald-800 mt-1">
            โค้ดชุดนี้ผ่านเกณฑ์การเข้าถึงตามมาตรฐาน WCAG 2.1 / 2.2 ครบถ้วน (100 / 100 คะแนน เกรด A)
          </p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="py-8 text-center text-stone-500 text-sm">
          ไม่พบรายการข้อบกพร่องที่ตรงกับตัวกรองที่เลือก
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const catTitle = SITE_CONFIG.categories[issue.category]?.title || issue.category;
            const isCopied = copiedSnippetId === issue.id;

            return (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/30 hover:border-stone-300 transition-all space-y-3"
              >
                {/* Issue Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                      บรรทัดที่ {issue.line}
                    </span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-900 text-white">
                      {issue.wcagCriterion}
                    </span>
                    <span className="text-xs text-stone-500">หมวด {catTitle}</span>
                  </div>
                </div>

                {/* Title and Impact Reason */}
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">{issue.title}</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    <span className="font-semibold text-stone-700">ผลกระทบต่อผู้ใช้งาน: </span>
                    {issue.impactReason}
                  </p>
                </div>

                {/* Code Diff Snippets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  {/* Original Snippet */}
                  <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950 overflow-x-auto">
                    <div className="text-[10px] font-sans font-semibold text-rose-800 uppercase tracking-wider mb-1">
                      โค้ดเดิม (Original)
                    </div>
                    <pre className="whitespace-pre">
                      <code>{issue.originalSnippet}</code>
                    </pre>
                  </div>

                  {/* Suggested Snippet */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 overflow-x-auto relative group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] font-sans font-semibold text-emerald-800 uppercase tracking-wider">
                        โค้ดแนะนำ (Suggested Fix)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(issue.id, issue.suggestedSnippet)}
                        className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center space-x-1"
                        title="คัดลอกโค้ดแนะนำนี้"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-emerald-700" />
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="whitespace-pre">
                      <code>{issue.suggestedSnippet}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
