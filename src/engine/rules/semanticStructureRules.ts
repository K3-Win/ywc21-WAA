import { AuditIssue } from '../../types/accessibility';
import { ParsedMarkupContext } from '../jsxNormalizer';

const LANDMARK_SELECTORS = [
  'main',
  'nav',
  'header',
  'footer',
  'aside',
  'section',
  'article',
  '[role="main"]',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '[role="region"]',
].join(', ');

/**
 * Audits WCAG Category 3: Semantic Structure & Heading Hierarchy (semantic)
 */
export function runSemanticStructureRules(ctx: ParsedMarkupContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { root, getElementLine, getOriginalOuterSnippet } = ctx;

  // 1. Audit Semantic Landmarks
  const landmarks = root.querySelectorAll(LANDMARK_SELECTORS);
  const divs = root.querySelectorAll('div');

  if (landmarks.length === 0 && divs.length > 0) {
    const targetEl = root.querySelector('div') || root.firstElementChild || root;
    const line = getElementLine(targetEl);
    const originalSnippet = getOriginalOuterSnippet(targetEl);

    let suggestedSnippet = originalSnippet;
    if (suggestedSnippet.startsWith('<div')) {
      suggestedSnippet = suggestedSnippet
        .replace(/^<div/, '<main')
        .replace(/<\/div>$/, '</main>');
    } else {
      suggestedSnippet = `<main>\n  ${originalSnippet}\n</main>`;
    }

    issues.push({
      id: `semantic-missing-landmark-${line}`,
      ruleId: 'semantic-missing-landmark',
      category: 'semantic',
      severity: 'moderate',
      line,
      wcagCriterion: 'WCAG 1.3.1 (Info and Relationships) / 2.4.1 (Bypass Blocks)',
      title: 'ไม่มีองค์ประกอบระบุขอบเขตเนื้อหา (Semantic Landmark)',
      impactReason:
        'ผู้ใช้งาน Screen Reader ต้องอาศัย Landmark เช่น <main>, <nav>, <header> ในการนำทางและข้ามไปยังเนื้อหาสำคัญของหน้าเว็บ',
      originalSnippet,
      suggestedSnippet,
    });
  }

  // 2. Audit Heading Hierarchy
  const headingElements = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let prevLevel = 0;

  headingElements.forEach((h, idx) => {
    const tagName = h.tagName.toLowerCase();
    const currentLevel = parseInt(tagName.replace('h', ''), 10);
    const line = getElementLine(h);
    const originalSnippet = getOriginalOuterSnippet(h);

    if (prevLevel === 0) {
      if (currentLevel > 1) {
        const suggestedTag = 'h1';
        const suggestedSnippet = originalSnippet
          .replace(new RegExp(`^<${tagName}`), `<${suggestedTag}`)
          .replace(new RegExp(`</${tagName}>$`), `</${suggestedTag}>`);

        issues.push({
          id: `heading-skipped-level-${line}-${idx}`,
          ruleId: 'heading-skipped-level',
          category: 'semantic',
          severity: 'moderate',
          line,
          wcagCriterion: 'WCAG 1.3.1 (Info and Relationships) / 2.4.6 (Headings and Labels)',
          title: `ลำดับของหัวข้อข้ามระดับ (เริ่มต้นด้วย <${tagName}> โดยไม่มี <h1>)`,
          impactReason:
            'หน้าเว็บควรเริ่มต้นโครงสร้างหัวข้อด้วย <h1> เพื่อเป็นหัวข้อหลัก ก่อนกระจายไปยังระดับถัดไป',
          originalSnippet,
          suggestedSnippet,
        });
      }
    } else {
      if (currentLevel > prevLevel + 1) {
        const suggestedLevel = prevLevel + 1;
        const suggestedTag = `h${suggestedLevel}`;
        const suggestedSnippet = originalSnippet
          .replace(new RegExp(`^<${tagName}`), `<${suggestedTag}`)
          .replace(new RegExp(`</${tagName}>$`), `</${suggestedTag}>`);

        issues.push({
          id: `heading-skipped-level-${line}-${idx}`,
          ruleId: 'heading-skipped-level',
          category: 'semantic',
          severity: 'moderate',
          line,
          wcagCriterion: 'WCAG 1.3.1 (Info and Relationships) / 2.4.6 (Headings and Labels)',
          title: `ลำดับของหัวข้อข้ามระดับ (จาก <h${prevLevel}> ข้ามไป <${tagName}>)`,
          impactReason:
            'การข้ามระดับหัวข้อย่อยทำให้ลำดับชั้นของเนื้อหาสับสนสำหรับผู้ใช้ Screen Reader ควรก้าวหน้าทีละระดับ',
          originalSnippet,
          suggestedSnippet,
        });
      }
    }

    prevLevel = currentLevel;
  });

  // 3. Audit Tables for <th> Headers
  const tables = Array.from(root.querySelectorAll('table'));
  tables.forEach((table, idx) => {
    const thElements = table.querySelectorAll('th');
    if (thElements.length === 0) {
      const line = getElementLine(table);
      const originalSnippet = getOriginalOuterSnippet(table);

      // Suggest converting first row <td> to <th scope="col">
      let suggestedSnippet = originalSnippet;
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const rowSnippet = getOriginalOuterSnippet(firstRow);
        const fixedRow = rowSnippet
          .replace(/<td\b/g, '<th scope="col"')
          .replace(/<\/td>/g, '</th>');
        suggestedSnippet = suggestedSnippet.replace(rowSnippet, fixedRow);
      }

      issues.push({
        id: `table-missing-th-${line}-${idx}`,
        ruleId: 'table-missing-th',
        category: 'semantic',
        severity: 'moderate',
        line,
        wcagCriterion: 'WCAG 1.3.1 (Info and Relationships)',
        title: 'ตารางข้อมูลไม่มีแถวหรือเซลล์หัวตาราง (<th>)',
        impactReason:
          'ตารางข้อมูลต้องมีเซลล์หัวตาราง (<th>) เพื่อให้ Screen Reader สามารถอ่านหัวข้อกำกับเซลล์ข้อมูลแต่ละช่องได้อย่างถูกต้อง',
        originalSnippet,
        suggestedSnippet,
      });
    }
  });

  return issues;
}
