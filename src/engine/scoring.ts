import { AuditIssue, ScoreResult } from '../types/accessibility';
import { SITE_CONFIG } from '../config/siteConfig';

/**
 * Calculates dynamic accessibility score, letter grade (A-F), star rating (1-5),
 * and performance label based on detected audit issues and SITE_CONFIG scoring configuration.
 */
export function calculateScore(issues: AuditIssue[]): ScoreResult {
  const { maxScore, minScore, penalties, grades } = SITE_CONFIG.scoring;

  let totalDeductions = 0;
  for (const issue of issues) {
    const penalty = penalties[issue.severity] ?? 0;
    totalDeductions += penalty;
  }

  const score = Math.max(minScore, maxScore - totalDeductions);

  // Match the highest threshold where score >= minScore
  const matchedGrade = grades.find((g) => score >= g.minScore) || grades[grades.length - 1];

  return {
    score,
    grade: matchedGrade.grade,
    stars: matchedGrade.stars,
    label: matchedGrade.label,
    deductions: totalDeductions,
  };
}
