import React from 'react';
import { Image, CheckSquare, Layout, Navigation, CheckCircle2 } from 'lucide-react';
import { CategoryId, ComparisonReport } from '../types/accessibility';
import { SITE_CONFIG } from '../config/siteConfig';

export interface CategorySummaryGridProps {
  comparison: ComparisonReport | null;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (categoryId: CategoryId | 'all') => void;
}

const CATEGORY_ICONS: Record<CategoryId, React.ElementType> = {
  'text-alt': Image,
  forms: CheckSquare,
  semantic: Layout,
  attributes: Navigation,
};

const CATEGORY_ORDER: CategoryId[] = ['text-alt', 'forms', 'semantic', 'attributes'];

export const CategorySummaryGrid: React.FC<CategorySummaryGridProps> = ({
  comparison,
  selectedCategory,
  onSelectCategory,
}) => {
  const isAnalyzed = comparison !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-800 tracking-tight">
          สรุปผลการตรวจสอบรายหมวดหมู่ (Category Summaries)
        </h2>
        {selectedCategory !== 'all' && (
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-xs text-stone-600 hover:text-stone-900 underline font-medium"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORY_ORDER.map((catId) => {
          const catConfig = SITE_CONFIG.categories[catId];
          const Icon = CATEGORY_ICONS[catId];
          const isSelected = selectedCategory === catId;

          const beforeCount = isAnalyzed ? comparison.originalReport.categorySummaries[catId] ?? 0 : null;
          const afterCount = isAnalyzed ? comparison.remediatedReport.categorySummaries[catId] ?? 0 : null;

          const isFullyFixed = isAnalyzed && (beforeCount ?? 0) > 0 && afterCount === 0;
          const isClean = isAnalyzed && (beforeCount ?? 0) === 0;

          return (
            <button
              type="button"
              key={catId}
              onClick={() => onSelectCategory(isSelected ? 'all' : catId)}
              aria-pressed={isSelected}
              className={`w-full text-left cursor-pointer rounded-xl p-4 border transition-all duration-150 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900 ring-offset-1'
                  : 'bg-white text-stone-900 border-stone-200 hover:border-stone-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-stone-800 text-stone-200'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {isFullyFixed && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>แก้ไขครบ</span>
                  </span>
                )}
                {isClean && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? 'bg-stone-800 text-stone-300 border border-stone-700'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    ผ่านเกณฑ์
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h3 className="font-semibold text-sm leading-tight">{catConfig.title}</h3>
                <p
                  className={`text-xs mt-0.5 line-clamp-1 ${
                    isSelected ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  {catConfig.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
                {isAnalyzed ? (
                  <span className={isSelected ? 'text-stone-300' : 'text-stone-600'}>
                    ก่อนแก้ {beforeCount} ประเด็น &rarr; หลังแก้ {afterCount} ประเด็น
                  </span>
                ) : (
                  <span className={isSelected ? 'text-stone-400' : 'text-stone-400'}>
                    ก่อนแก้ - ประเด็น &rarr; หลังแก้ - ประเด็น
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
