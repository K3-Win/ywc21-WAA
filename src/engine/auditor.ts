import { AuditReport, ComparisonReport, CategoryId, SeverityLevel, AuditIssue } from '../types/accessibility';
import { parseMarkupWithLines } from './jsxNormalizer';
import { calculateScore } from './scoring';
import { runTextAlternativeRules } from './rules/textAlternativeRules';
import { runFormControlRules } from './rules/formControlRules';
import { runSemanticStructureRules } from './rules/semanticStructureRules';
import { runAttributeNavigationRules } from './rules/attributeNavigationRules';
import { remediateCode } from './remediator';

/**
 * Creates empty category summaries initialized to 0.
 */
function createEmptyCategorySummaries(): Record<CategoryId, number> {
  return {
    'text-alt': 0,
    forms: 0,
    semantic: 0,
    attributes: 0,
  };
}

/**
 * Creates empty severity counts initialized to 0.
 */
function createEmptySeverityCounts(): Record<SeverityLevel, number> {
  return {
    critical: 0,
    moderate: 0,
    minor: 0,
  };
}

/**
 * Performs a comprehensive accessibility audit against WCAG 2.1/2.2 guidelines
 * across all 4 rule categories: text-alt, forms, semantic, and attributes.
 */
export function auditCode(code: string): AuditReport {
  if (!code || code.trim() === '') {
    return {
      syntaxMode: 'html',
      isEmpty: true,
      scoreResult: calculateScore([]),
      issues: [],
      categorySummaries: createEmptyCategorySummaries(),
      severityCounts: createEmptySeverityCounts(),
    };
  }

  const ctx = parseMarkupWithLines(code);

  const textAltIssues = runTextAlternativeRules(ctx);
  const formIssues = runFormControlRules(ctx);
  const semanticIssues = runSemanticStructureRules(ctx);
  const attributeIssues = runAttributeNavigationRules(ctx);

  const allIssues: AuditIssue[] = [
    ...textAltIssues,
    ...formIssues,
    ...semanticIssues,
    ...attributeIssues,
  ];

  // Sort issues by line number for intuitive reading
  allIssues.sort((a, b) => a.line - b.line);

  const categorySummaries = createEmptyCategorySummaries();
  const severityCounts = createEmptySeverityCounts();

  for (const issue of allIssues) {
    categorySummaries[issue.category] = (categorySummaries[issue.category] || 0) + 1;
    severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
  }

  const scoreResult = calculateScore(allIssues);

  return {
    syntaxMode: ctx.syntaxMode,
    isEmpty: false,
    scoreResult,
    issues: allIssues,
    categorySummaries,
    severityCounts,
  };
}

/**
 * Orchestrates full before-and-after audit and auto-remediation workflow:
 * audits original markup, generates remediated markup, re-audits the remediated markup,
 * and calculates score improvements.
 */
export function analyzeAndRemediate(code: string): ComparisonReport {
  const originalReport = auditCode(code);
  const remediatedCode = remediateCode(code);
  const remediatedReport = auditCode(remediatedCode);
  const scoreDelta = remediatedReport.scoreResult.score - originalReport.scoreResult.score;

  return {
    originalReport,
    remediatedCode,
    remediatedReport,
    scoreDelta,
  };
}
