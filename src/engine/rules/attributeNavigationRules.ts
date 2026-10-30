import { AuditIssue } from '../../types/accessibility';
import { ParsedMarkupContext } from '../jsxNormalizer';

const VAGUE_LINK_TEXTS = new Set([
  'คลิกที่นี่',
  'คลิก',
  'ที่นี่',
  'กดที่นี่',
  'กดตรงนี้',
  'อ่านต่อ',
  'ดูเพิ่มเติม',
  'เพิ่มเติม',
  'รายละเอียด',
  'click here',
  'click',
  'here',
  'read more',
  'more',
  'learn more',
  'view more',
  'details',
  'see more',
]);

/**
 * Audits WCAG Category 4: Attributes, Roles & Navigation (attributes)
 */
export function runAttributeNavigationRules(ctx: ParsedMarkupContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { root, syntaxMode, getElementLine, getOriginalOuterSnippet } = ctx;

  // 1. Audit non-semantic interactive elements (div, span with onClick/onclick)
  const clickElements = Array.from(root.querySelectorAll('div, span, p'));
  clickElements.forEach((el, idx) => {
    const tagName = el.tagName.toLowerCase();
    const hasClick =
      el.hasAttribute('onclick') ||
      el.hasAttribute('onClick') ||
      el.getAttribute('role') === 'button';

    if (hasClick && (tagName === 'div' || tagName === 'span' || tagName === 'p')) {
      const role = el.getAttribute('role');
      const hasKeyHandler =
        el.hasAttribute('onkeydown') ||
        el.hasAttribute('onkeypress') ||
        el.hasAttribute('onkeyup') ||
        el.hasAttribute('onKeyDown') ||
        el.hasAttribute('onKeyPress') ||
        el.hasAttribute('onKeyUp');
      const tabIndexVal = el.getAttribute('tabindex') || el.getAttribute('tabIndex');
      const hasAccessibleButtonRole = role === 'button' && hasKeyHandler && tabIndexVal === '0';

      if (!hasAccessibleButtonRole) {
        const line = getElementLine(el);
        const originalSnippet = getOriginalOuterSnippet(el);

        let suggestedSnippet = originalSnippet
          .replace(new RegExp(`^<${tagName}`), '<button type="button"')
          .replace(new RegExp(`</${tagName}>$`), '</button>');

        // In JSX mode, ensure onClick is used; in HTML, onclick
        if (syntaxMode === 'jsx') {
          suggestedSnippet = suggestedSnippet.replace(/\bonclick=/g, 'onClick=');
        } else {
          suggestedSnippet = suggestedSnippet.replace(/\bonClick=/g, 'onclick=');
        }

        issues.push({
          id: `interactive-non-semantic-${line}-${idx}`,
          ruleId: 'interactive-non-semantic',
          category: 'attributes',
          severity: 'critical',
          line,
          wcagCriterion: 'WCAG 4.1.2 (Name, Role, Value) / 2.1.1 (Keyboard)',
          title: `ใช้องค์ประกอบที่ไม่ใช่เชิงโต้ตอบ (<${tagName}>) รับเหตุการณ์คลิก`,
          impactReason:
            `การใช้ <${tagName}> ในการรับเหตุการณ์คลิกแทน <button> ทำให้ผู้ใช้งานคีย์บอร์ดไม่สามารถกดปุ่ม Tab หรือกด Enter/Space เพื่อสั่งงานได้`,
          originalSnippet,
          suggestedSnippet,
        });
      }
    }
  });

  // 2. Audit positive tabIndex (> 0)
  const allElements = Array.from(root.querySelectorAll('*'));
  allElements.forEach((el, idx) => {
    const rawVal = el.getAttribute('tabindex') || el.getAttribute('tabIndex');
    if (rawVal !== null) {
      const cleaned = rawVal.replace(/[{}"']/g, '').trim();
      const num = parseInt(cleaned, 10);

      if (!isNaN(num) && num > 0) {
        const line = getElementLine(el);
        const originalSnippet = getOriginalOuterSnippet(el);
        const suggestedSnippet = originalSnippet
          .replace(/\btabIndex=\{[0-9]+\}/g, '')
          .replace(/\btabIndex="[0-9]+"/g, '')
          .replace(/\btabindex="[0-9]+"/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s+>/g, '>')
          .replace(/\s+\/>/g, ' />');

        issues.push({
          id: `tabindex-positive-${line}-${idx}`,
          ruleId: 'tabindex-positive',
          category: 'attributes',
          severity: 'minor',
          line,
          wcagCriterion: 'WCAG 2.4.3 (Focus Order)',
          title: 'กำหนดค่า tabIndex เป็นค่าบวก (> 0)',
          impactReason:
            'การกำหนด tabIndex เป็นค่าบวกจะทำลายลำดับการนำทางด้วยคีย์บอร์ดตามธรรมชาติ (Focus Order) ทำให้ผู้ใช้คีย์บอร์ดสับสน',
          originalSnippet,
          suggestedSnippet,
        });
      }
    }
  });

  // 3. Audit links (<a>)
  const links = Array.from(root.querySelectorAll('a'));
  links.forEach((link, idx) => {
    const hasHref = link.hasAttribute('href');
    const hrefVal = link.getAttribute('href')?.trim();

    if (!hasHref || hrefVal === '' || hrefVal === '#') {
      const line = getElementLine(link);
      const originalSnippet = getOriginalOuterSnippet(link);
      let suggestedSnippet = originalSnippet;

      if (!hasHref) {
        suggestedSnippet = originalSnippet.replace(/^<a/, '<a href="#section"');
      } else if (hrefVal === '' || hrefVal === '#') {
        suggestedSnippet = originalSnippet.replace(/href=(["'])#?\1/, 'href="/destination"');
      }

      issues.push({
        id: `link-missing-href-${line}-${idx}`,
        ruleId: 'link-missing-href',
        category: 'attributes',
        severity: 'moderate',
        line,
        wcagCriterion: 'WCAG 2.1.1 (Keyboard) / 4.1.2 (Name, Role, Value)',
        title: 'ลิงก์ (<a>) ไม่มีแอตทริบิวต์ href หรือระบุปลายทางไม่ถูกต้อง',
        impactReason:
          'แท็ก <a> ที่ไม่มี href จะไม่สามารถรับโฟกัสด้วยปุ่ม Tab ได้ และไม่ถูกประกาศว่าเป็นลิงก์สำหรับโปรแกรมอ่านจอภาพ',
        originalSnippet,
        suggestedSnippet,
      });
    }

    // Check vague link text
    const ariaLabel = link.getAttribute('aria-label')?.trim();
    const linkText = (ariaLabel || link.textContent || '').trim().toLowerCase();
    const normalized = linkText.replace(/[.\-_>›»…]+/g, '').trim();

    if (VAGUE_LINK_TEXTS.has(linkText) || VAGUE_LINK_TEXTS.has(normalized)) {
      const line = getElementLine(link);
      const originalSnippet = getOriginalOuterSnippet(link);
      const descriptiveText = 'อ่านรายละเอียดข้อมูลเพิ่มเติม';

      let suggestedSnippet = originalSnippet;
      if (link.textContent && originalSnippet.includes(link.textContent)) {
        suggestedSnippet = originalSnippet.replace(link.textContent, descriptiveText);
      } else {
        suggestedSnippet = `<a href="${hrefVal || '#'}">${descriptiveText}</a>`;
      }

      issues.push({
        id: `link-vague-text-${line}-${idx}`,
        ruleId: 'link-vague-text',
        category: 'attributes',
        severity: 'moderate',
        line,
        wcagCriterion: 'WCAG 2.4.4 (Link Purpose In Context)',
        title: 'ข้อความของลิงก์คลุมเครือไม่สื่อความหมาย (Vague Link Text)',
        impactReason:
          'ข้อความอย่างเช่น "คลิกที่นี่" หรือ "อ่านต่อ" ไม่ระบุวัตถุประสงค์หรือปลายทาง เมื่อผู้ใช้ Screen Reader เรียกดูรายการลิงก์เฉพาะจะไม่เข้าใจว่าไปยังที่ใด',
        originalSnippet,
        suggestedSnippet,
      });
    }
  });

  return issues;
}
