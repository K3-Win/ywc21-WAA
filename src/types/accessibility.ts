export type SyntaxMode = 'html' | 'jsx';

export type SeverityLevel = 'critical' | 'moderate' | 'minor';

export type CategoryId = 'text-alt' | 'forms' | 'semantic' | 'attributes';

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AuditIssue {
  id: string;
  ruleId: string;
  category: CategoryId;
  severity: SeverityLevel;
  line: number;
  wcagCriterion: string;
  title: string;
  impactReason: string;
  originalSnippet: string;
  suggestedSnippet: string;
}

export interface CategorySummary {
  categoryId: CategoryId;
  title: string;
  subtitle: string;
  count: number;
}

export interface ScoreResult {
  score: number;
  grade: GradeLetter;
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
  deductions: number;
}

export interface AuditReport {
  syntaxMode: SyntaxMode;
  isEmpty: boolean;
  scoreResult: ScoreResult;
  issues: AuditIssue[];
  categorySummaries: Record<CategoryId, number>;
  severityCounts: Record<SeverityLevel, number>;
}

export interface ComparisonReport {
  originalReport: AuditReport;
  remediatedCode: string;
  remediatedReport: AuditReport;
  scoreDelta: number;
}

export interface SampleSnippet {
  id: string;
  name: string;
  description: string;
  syntaxMode: SyntaxMode;
  code: string;
}

export interface GradeThreshold {
  grade: GradeLetter;
  minScore: number;
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
}

export interface SiteConfig {
  branding: {
    name: string;
    tagline: string;
    logoText: string;
  };
  scoring: {
    maxScore: number;
    minScore: number;
    penalties: Record<SeverityLevel, number>;
    grades: GradeThreshold[];
  };
  categories: Record<CategoryId, {
    title: string;
    subtitle: string;
  }>;
}
