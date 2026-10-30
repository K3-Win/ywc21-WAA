import { AuditIssue } from '../../types/accessibility';
import { ParsedMarkupContext } from '../jsxNormalizer';

const EXCLUDED_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset']);

function hasAccessibleLabel(el: Element, doc: Document): boolean {
  // 1. Check aria-label
  if (el.getAttribute('aria-label')?.trim()) {
    return true;
  }

  // 2. Check aria-labelledby
  if (el.getAttribute('aria-labelledby')?.trim()) {
    return true;
  }

  // 3. Check enclosing <label>
  if (el.closest('label') !== null) {
    return true;
  }

  // 4. Check matching <label for="..."> or <label htmlFor="...">
  const id = el.getAttribute('id')?.trim();
  if (id) {
    const labels = Array.from(doc.querySelectorAll('label'));
    const matches = labels.some((lbl) => {
      const forAttr =
        lbl.getAttribute('for') ||
        lbl.getAttribute('htmlfor') ||
        lbl.getAttribute('htmlFor');
      return forAttr?.trim() === id;
    });
    if (matches) {
      return true;
    }
  }

  return false;
}

function hasButtonAccessibleName(btn: Element): boolean {
  if (btn.getAttribute('aria-label')?.trim()) {
    return true;
  }
  if (btn.getAttribute('aria-labelledby')?.trim()) {
    return true;
  }
  if (btn.textContent?.trim()) {
    return true;
  }

  const childImg = btn.querySelector('img');
  if (childImg && childImg.getAttribute('alt')?.trim()) {
    return true;
  }

  const childSvg = btn.querySelector('svg');
  if (childSvg) {
    if (childSvg.getAttribute('aria-label')?.trim()) {
      return true;
    }
    if (childSvg.querySelector('title')?.textContent?.trim()) {
      return true;
    }
  }

  return false;
}

/**
 * Audits WCAG Category 2: Form Controls & Labels (forms)
 */
export function runFormControlRules(ctx: ParsedMarkupContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { doc, root, syntaxMode, getElementLine, getOriginalOuterSnippet } = ctx;

  // 1. Audit form inputs, selects, textareas
  const formControls = Array.from(root.querySelectorAll('input, select, textarea'));
  formControls.forEach((el, idx) => {
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (EXCLUDED_INPUT_TYPES.has(type)) {
        return;
      }
    }

    const ariaHidden = el.getAttribute('aria-hidden');
    if (ariaHidden === 'true' || ariaHidden === '{true}') {
      return;
    }

    const hasLabel = hasAccessibleLabel(el, doc);
    const placeholder = el.getAttribute('placeholder')?.trim();

    if (!hasLabel) {
      const line = getElementLine(el);
      const originalSnippet = getOriginalOuterSnippet(el);
      const id = el.getAttribute('id') || 'form-input';
      const labelAttr = syntaxMode === 'jsx' ? `htmlFor="${id}"` : `for="${id}"`;

      let patchedControl = originalSnippet;
      if (!el.hasAttribute('id')) {
        patchedControl = patchedControl.replace(
          new RegExp(`^<${tagName}`),
          `<${tagName} id="${id}"`
        );
      }

      const suggestedSnippet = `<label ${labelAttr}>ป้ายชื่อข้อมูล</label>\n${patchedControl}`;

      issues.push({
        id: `form-input-missing-label-${line}-${idx}`,
        ruleId: 'form-input-missing-label',
        category: 'forms',
        severity: 'critical',
        line,
        wcagCriterion: 'WCAG 1.3.1 (Info and Relationships) / 4.1.2 (Name, Role, Value)',
        title: `องค์ประกอบฟอร์ม (<${tagName}>) ไม่มีป้ายชื่อกำกับ (Label)`,
        impactReason:
          'ผู้ใช้งาน Screen Reader จะไม่ทราบวัตถุประสงค์ของช่องกรอกข้อมูลนี้ เนื่องจากไม่มี <label> เชื่อมโยงหรือไม่มี aria-label',
        originalSnippet,
        suggestedSnippet,
      });

      if (placeholder) {
        issues.push({
          id: `form-input-placeholder-only-${line}-${idx}`,
          ruleId: 'form-input-placeholder-only',
          category: 'forms',
          severity: 'moderate',
          line,
          wcagCriterion: 'WCAG 3.3.2 (Labels or Instructions)',
          title: 'ใช้ placeholder แทนป้ายชื่อกำกับ (Accessible Label)',
          impactReason:
            'placeholder จะหายไปเมื่อเริ่มพิมพ์ และโปรแกรมอ่านจอภาพบางรุ่นอาจข้ามการอ่านข้อความ placeholder จึงไม่สามารถใช้แทนป้ายชื่อ <label> ได้',
          originalSnippet,
          suggestedSnippet,
        });
      }
    }
  });

  // 2. Audit <button> elements
  const buttons = Array.from(root.querySelectorAll('button'));
  buttons.forEach((btn, idx) => {
    const ariaHidden = btn.getAttribute('aria-hidden');
    if (ariaHidden === 'true' || ariaHidden === '{true}') {
      return;
    }

    if (!hasButtonAccessibleName(btn)) {
      const line = getElementLine(btn);
      const originalSnippet = getOriginalOuterSnippet(btn);
      let suggestedSnippet: string;

      if (originalSnippet.includes('</button>')) {
        suggestedSnippet = originalSnippet.replace('</button>', 'ข้อความปุ่ม</button>');
      } else if (originalSnippet.includes('/>')) {
        suggestedSnippet = originalSnippet.replace('/>', '>ข้อความปุ่ม</button>');
      } else {
        suggestedSnippet = `${originalSnippet}ข้อความปุ่ม</button>`;
      }

      issues.push({
        id: `button-empty-${line}-${idx}`,
        ruleId: 'button-empty',
        category: 'forms',
        severity: 'critical',
        line,
        wcagCriterion: 'WCAG 4.1.2 (Name, Role, Value)',
        title: 'ปุ่มกด (<button>) ไม่มีข้อความระบุการทำงาน',
        impactReason:
          'ผู้ใช้งาน Screen Reader จะได้ยินเพียงคำว่า "button" โดยไม่ทราบหน้าที่ของปุ่มเนื่องจากไม่มีข้อความหรือ aria-label',
        originalSnippet,
        suggestedSnippet,
      });
    }
  });

  return issues;
}
