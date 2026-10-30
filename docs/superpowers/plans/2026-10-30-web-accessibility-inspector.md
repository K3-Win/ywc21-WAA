# Web Accessibility Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side Web Accessibility Inspector in React, TypeScript, and Tailwind CSS that audits HTML/JSX snippets across 4 WCAG categories, calculates severity-weighted scores/grades/stars, generates full remediated code, and re-audits the remediated code to verify the post-fix score.

**Architecture:** A modular client-side auditing engine (`src/engine/`) preprocesses HTML and JSX snippets (preserving line numbers and syntax flavor), parses them into a traversable DOM tree, runs 4 category rule modules, computes scores via centralized config (`src/config/siteConfig.ts`), generates syntax-aware remediated code, and re-runs the auditor on the remediated output. The React UI displays a minimalist light-themed split view (Original Code on Left, Remediated Code on Right) that shows `-` placeholders until the user clicks Analyze.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest + jsdom (for unit and component testing).

**Spec:** `docs/superpowers/specs/2026-10-30-web-accessibility-inspector-design.md`

## Global Constraints

- **Zero Emojis:** Do not use any emoji characters in UI labels, buttons, presets, badges, or code comments displayed to users.
- **No AI / No External APIs:** Auditing and remediation must be 100% deterministic and run synchronously on the client side.
- **Centralized Minimal Config:** Branding/logo settings and scoring thresholds/penalties live in `src/config/siteConfig.ts`, and sample snippets live in `src/config/sampleSnippets.ts`. UI copy and labels live directly in the React components for easy editing.
- **Explicit Analyze Trigger:** Before clicking the Analyze button (and whenever the user edits the input or loads a new preset), all scores, grades, star ratings, and category counts must display `-`.
- **Responsive Split Layout:** Side-by-side 2-column comparison on desktop (`lg:grid-cols-2`), stacked single-column on mobile (`grid-cols-1`).

## Review Focus

1. **JSX Self-Closing Non-Void Elements (`<div className="box" />` followed by `<input type="text" />`):** Standard HTML `DOMParser` swallows siblings into unclosed `<div />`; the normalizer must expand self-closing non-void tags before parsing so subsequent elements are still audited accurately.
2. **JSX Expression Attributes (`<img src={avatarUrl} alt={userName} />` vs `<img src={avatarUrl} alt={""} />`):** Non-empty JSX expressions in `alt` or `aria-label` must be recognized as valid provided values, while empty expressions (`alt={""}` or `alt={''}`) on informative images are flagged appropriately.
3. **HTML `for` vs JSX `htmlFor` Label Binding:** `<label htmlFor="email">` in JSX and `<label for="email">` in HTML must both satisfy form control labeling, and remediation of unlabeled inputs in JSX mode must emit `htmlFor` and `className` instead of `for` and `class`.
4. **Empty or Whitespace-Only Input:** Clicking Analyze on an empty or whitespace-only string must not throw a runtime error or award a fake 100/A score; it must return a clean empty/un-auditable state and keep `-` placeholders.
5. **Post-Remediation Re-Audit Verification:** `analyzeAndRemediate(code)` must genuinely pass `remediatedCode` back through `auditCode(remediatedCode)` so that the after-score, grade, and remaining issues reflect an actual second audit pass, improving all bundled sample snippets to Grade A (90–100).

---

### Task 1: Project Scaffolding, Core Types, and Centralized Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/types/accessibility.ts`
- Create: `src/config/siteConfig.ts`
- Create: `src/config/sampleSnippets.ts`
- Test: `src/config/__tests__/siteConfig.test.ts`

**Interfaces:**
- Produces:
  - `SyntaxMode = 'html' | 'jsx'`
  - `SeverityLevel = 'critical' | 'moderate' | 'minor'`
  - `CategoryId = 'text-alt' | 'forms' | 'semantic' | 'attributes'`
  - `GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F'`
  - `AuditIssue`: `{ id: string; ruleId: string; category: CategoryId; severity: SeverityLevel; line: number; wcagCriterion: string; title: string; impactReason: string; originalSnippet: string; suggestedSnippet: string; }`
  - `CategorySummary`: `{ categoryId: CategoryId; title: string; subtitle: string; count: number; }`
  - `ScoreResult`: `{ score: number; grade: GradeLetter; stars: 1 | 2 | 3 | 4 | 5; label: string; deductions: number; }`
  - `AuditReport`: `{ syntaxMode: SyntaxMode; isEmpty: boolean; scoreResult: ScoreResult; issues: AuditIssue[]; categorySummaries: Record<CategoryId, number>; severityCounts: Record<SeverityLevel, number>; }`
  - `ComparisonReport`: `{ originalReport: AuditReport; remediatedCode: string; remediatedReport: AuditReport; scoreDelta: number; }`
  - `SITE_CONFIG` in `src/config/siteConfig.ts`
  - `SAMPLE_SNIPPETS` in `src/config/sampleSnippets.ts`

- [ ] **Step 1: Create project configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/index.css`) and install dependencies**

 Create `package.json` with `react`, `react-dom`, `lucide-react` and devDependencies `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.

- [ ] **Step 2: Write the failing test in `src/config/__tests__/siteConfig.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { SITE_CONFIG } from '../siteConfig';
import { SAMPLE_SNIPPETS } from '../sampleSnippets';

describe('siteConfig and sampleSnippets', () => {
  it('defines exact severity penalties and 5 grade thresholds without any emoji characters', () => {
    expect(SITE_CONFIG.scoring.penalties).toEqual({
      critical: 20,
      moderate: 10,
      minor: 5,
    });
    expect(SITE_CONFIG.scoring.grades.map((g) => g.grade)).toEqual(['A', 'B', 'C', 'D', 'F']);
    const emojiRegex = /\p{Extended_Pictographic}/u;
    expect(emojiRegex.test(JSON.stringify(SITE_CONFIG))).toBe(false);
    expect(emojiRegex.test(JSON.stringify(SAMPLE_SNIPPETS))).toBe(false);
  });

  it('includes at least 4 sample presets covering critical, semantic, passing, and jsx', () => {
    expect(SAMPLE_SNIPPETS.length).toBeGreaterThanOrEqual(4);
    const ids = SAMPLE_SNIPPETS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['critical', 'semantic', 'pass', 'jsx-form']));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/config/__tests__/siteConfig.test.ts`
Expected: FAIL with module not found `../siteConfig`

- [ ] **Step 4: Implement `src/types/accessibility.ts`, `src/config/siteConfig.ts`, and `src/config/sampleSnippets.ts`**

Define all exported interfaces in `src/types/accessibility.ts`, complete Thai/English labels and scoring rules in `src/config/siteConfig.ts` (with prominent comments guiding the user on how to customize branding/copy), and 4 sample snippets in `src/config/sampleSnippets.ts`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/config/__tests__/siteConfig.test.ts`
Expected: PASS

---

### Task 2: JSX/HTML Preprocessor, Line Tracker, and Dynamic Scoring Engine

**Files:**
- Create: `src/engine/jsxNormalizer.ts`
- Create: `src/engine/scoring.ts`
- Test: `src/engine/__tests__/jsxNormalizerAndScoring.test.ts`

**Interfaces:**
- Consumes: `SyntaxMode`, `SeverityLevel`, `CategoryId`, `AuditIssue`, `ScoreResult`, `SITE_CONFIG`
- Produces:
  - `detectSyntaxMode(code: string): SyntaxMode` in `src/engine/jsxNormalizer.ts`
  - `parseMarkupWithLines(code: string): { doc: Document; root: HTMLElement; syntaxMode: SyntaxMode; lines: string[]; getElementLine: (el: Element) => number; getOriginalOuterSnippet: (el: Element) => string; }` in `src/engine/jsxNormalizer.ts`
  - `calculateScore(issues: AuditIssue[]): ScoreResult` in `src/engine/scoring.ts`

- [ ] **Step 1: Write the failing test in `src/engine/__tests__/jsxNormalizerAndScoring.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { detectSyntaxMode, parseMarkupWithLines } from '../jsxNormalizer';
import { calculateScore } from '../scoring';
import { AuditIssue } from '../../types/accessibility';

describe('jsxNormalizer', () => {
  it('detects JSX syntax from className, htmlFor, or brace expressions', () => {
    expect(detectSyntaxMode('<div className="box"><label htmlFor="a">A</label></div>')).toBe('jsx');
    expect(detectSyntaxMode('<div class="box"><label for="a">A</label></div>')).toBe('html');
  });

  it('expands self-closing non-void JSX tags so following sibling elements are not swallowed', () => {
    const code = [
      '<div className="wrapper">',
      '  <div className="icon-box" />',
      '  <input type="email" placeholder="Email" />',
      '</div>',
    ].join('\n');
    const parsed = parseMarkupWithLines(code);
    const inputEl = parsed.root.querySelector('input');
    expect(inputEl).not.toBeNull();
    expect(parsed.getElementLine(inputEl!)).toBe(3);
  });

  it('preserves JSX expression attributes and marks empty vs non-empty expressions', () => {
    const code = '<img src={user.avatar} alt={user.name} />\n<img src="/a.png" alt={""} />';
    const parsed = parseMarkupWithLines(code);
    const imgs = parsed.root.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute('alt')).toBe('{user.name}');
    expect(imgs[1].getAttribute('alt')).toBe('');
  });
});

describe('calculateScore', () => {
  it('deducts 20 for critical, 10 for moderate, 5 for minor and maps to Grade and Stars', () => {
    const mockIssues: AuditIssue[] = [
      {
        id: '1',
        ruleId: 'img-alt',
        category: 'text-alt',
        severity: 'critical',
        line: 1,
        wcagCriterion: 'WCAG 1.1.1',
        title: 'Missing alt',
        impactReason: 'Reason',
        originalSnippet: '<img src="a.jpg">',
        suggestedSnippet: '<img src="a.jpg" alt="คำอธิบายภาพ">',
      },
      {
        id: '2',
        ruleId: 'heading-order',
        category: 'semantic',
        severity: 'moderate',
        line: 2,
        wcagCriterion: 'WCAG 1.3.1',
        title: 'Skipped heading',
        impactReason: 'Reason',
        originalSnippet: '<h3>Title</h3>',
        suggestedSnippet: '<h1>Title</h1>',
      },
    ];
    const res = calculateScore(mockIssues);
    expect(res.score).toBe(70);
    expect(res.grade).toBe('C');
    expect(res.stars).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/jsxNormalizerAndScoring.test.ts`
Expected: FAIL with module not found `../jsxNormalizer`

- [ ] **Step 3: Implement `src/engine/jsxNormalizer.ts` and `src/engine/scoring.ts`**

In `src/engine/jsxNormalizer.ts`:
- Detect JSX when `className=`, `htmlFor=`, `onClick=`, `tabIndex=`, `<>`, or `={...}` is present.
- Annotate each opening tag with a `data-a11y-line="<1-based-line>"` attribute before parsing, expand JSX fragments `<>...</>` into `<div data-a11y-fragment="true">...</div>`, convert non-void self-closing tags `<div ... />` or `<CustomComp ... />` into `<div ...></div>`, and convert attribute expressions `attr={""}` / `attr={''}` to `attr=""` and `attr={expr}` to `attr="{expr}"`.
- Parse with `DOMParser` (`text/html`) and return helper functions `getElementLine(el)` and `getOriginalOuterSnippet(el)`.

In `src/engine/scoring.ts`:
- Sum penalties from `SITE_CONFIG.scoring.penalties`, clamp `score = Math.max(0, 100 - totalDeductions)`, and match the highest threshold in `SITE_CONFIG.scoring.grades`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/jsxNormalizerAndScoring.test.ts`
Expected: PASS

---

### Task 3: WCAG Auditing Rule Modules (All 4 Categories)

**Files:**
- Create: `src/engine/rules/textAlternativeRules.ts`
- Create: `src/engine/rules/formControlRules.ts`
- Create: `src/engine/rules/semanticStructureRules.ts`
- Create: `src/engine/rules/attributeNavigationRules.ts`
- Test: `src/engine/__tests__/rules.test.ts`

**Interfaces:**
- Consumes: `parseMarkupWithLines` return object (`ParsedMarkupContext`), `AuditIssue`, `SyntaxMode`
- Produces:
  - `runTextAlternativeRules(ctx: ParsedMarkupContext): AuditIssue[]`
  - `runFormControlRules(ctx: ParsedMarkupContext): AuditIssue[]`
  - `runSemanticStructureRules(ctx: ParsedMarkupContext): AuditIssue[]`
  - `runAttributeNavigationRules(ctx: ParsedMarkupContext): AuditIssue[]`

- [ ] **Step 1: Write the failing test in `src/engine/__tests__/rules.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { parseMarkupWithLines } from '../jsxNormalizer';
import { runTextAlternativeRules } from '../rules/textAlternativeRules';
import { runFormControlRules } from '../rules/formControlRules';
import { runSemanticStructureRules } from '../rules/semanticStructureRules';
import { runAttributeNavigationRules } from '../rules/attributeNavigationRules';

describe('WCAG 4 Category Rule Modules', () => {
  it('Category 1 (Text Alternative): flags missing alt, filename/redundant alt, unlabeled svg, and video without track', () => {
    const ctx = parseMarkupWithLines(`
      <div>
        <img src="/promo.jpg" />
        <img src="/hero.png" alt="image of hero.png" />
        <video src="/clip.mp4"></video>
      </div>
    `);
    const issues = runTextAlternativeRules(ctx);
    expect(issues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining(['img-missing-alt', 'img-redundant-alt', 'media-missing-track'])
    );
  });

  it('Category 2 (Forms): flags input without label, recognizes htmlFor in JSX, and flags empty button', () => {
    const badCtx = parseMarkupWithLines(`
      <form>
        <input type="email" placeholder="กรอกอีเมล" />
        <button type="button"></button>
      </form>
    `);
    const badIssues = runFormControlRules(badCtx);
    expect(badIssues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining(['form-input-missing-label', 'button-empty'])
    );

    const goodJsxCtx = parseMarkupWithLines(`
      <form>
        <label htmlFor="user-email">อีเมล</label>
        <input id="user-email" type="email" />
      </form>
    `);
    expect(runFormControlRules(goodJsxCtx)).toHaveLength(0);
  });

  it('Category 3 (Semantic): flags missing landmarks on div containers, skipped heading levels, and table without th', () => {
    const ctx = parseMarkupWithLines(`
      <div class="page">
        <h3>หัวข้อข้ามระดับ</h3>
        <table><tr><td>ข้อมูล</td></tr></table>
      </div>
    `);
    const issues = runSemanticStructureRules(ctx);
    expect(issues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining(['semantic-missing-landmark', 'heading-skipped-level', 'table-missing-th'])
    );
  });

  it('Category 4 (Attributes & Navigation): flags div with onClick, vague or href-less links, and positive tabIndex', () => {
    const ctx = parseMarkupWithLines(`
      <main>
        <h1>หน้าหลัก</h1>
        <div onClick={submit} tabIndex={3}>ส่งข้อมูล</div>
        <a href="/more">คลิกที่นี่</a>
        <a>ลิงก์ไม่มีปลายทาง</a>
      </main>
    `);
    const issues = runAttributeNavigationRules(ctx);
    expect(issues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining([
        'interactive-non-semantic',
        'tabindex-positive',
        'link-vague-text',
        'link-missing-href',
      ])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/rules.test.ts`
Expected: FAIL with module not found `../rules/textAlternativeRules`

- [ ] **Step 3: Implement the 4 rule modules in `src/engine/rules/`**

Implement each rule module returning `AuditIssue[]` with accurate Thai explanations, WCAG 2.1/2.2 criterion tags, exact line numbers via `ctx.getElementLine(el)`, and syntax-aware `suggestedSnippet` (using `htmlFor`/`className`/`onClick` when `ctx.syntaxMode === 'jsx'`, and `for`/`class`/`onclick` when `'html'`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/rules.test.ts`
Expected: PASS

---

### Task 4: Auto-Remediation Generator and Re-Audit Orchestrator

**Files:**
- Create: `src/engine/remediator.ts`
- Create: `src/engine/auditor.ts`
- Test: `src/engine/__tests__/auditorAndRemediator.test.ts`

**Interfaces:**
- Consumes: `parseMarkupWithLines`, all 4 rule modules, `calculateScore`, `AuditReport`, `ComparisonReport`
- Produces:
  - `remediateCode(code: string): string` in `src/engine/remediator.ts`
  - `auditCode(code: string): AuditReport` in `src/engine/auditor.ts`
  - `analyzeAndRemediate(code: string): ComparisonReport` in `src/engine/auditor.ts`

- [ ] **Step 1: Write the failing test in `src/engine/__tests__/auditorAndRemediator.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { auditCode, analyzeAndRemediate } from '../auditor';
import { SAMPLE_SNIPPETS } from '../../config/sampleSnippets';

describe('auditor and remediator', () => {
  it('handles empty or whitespace-only input safely by marking isEmpty=true', () => {
    const report = auditCode('   \n  ');
    expect(report.isEmpty).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('remediates critical JSX code and verifies the post-remediation score via re-audit reaches Grade A', () => {
    const jsxSnippet = [
      '<div className="card">',
      '  <img src="/promo.jpg" />',
      '  <h3>ลงทะเบียนรับสิทธิ์</h3>',
      '  <input type="email" placeholder="กรอกอีเมล" />',
      '  <div onClick={handleSend} tabIndex={2}>ยืนยันข้อมูล</div>',
      '</div>',
    ].join('\n');

    const comparison = analyzeAndRemediate(jsxSnippet);
    expect(comparison.originalReport.scoreResult.score).toBeLessThan(50);
    expect(comparison.remediatedCode).toContain('alt=');
    expect(comparison.remediatedCode).toContain('htmlFor=');
    expect(comparison.remediatedCode).toContain('<button');
    expect(comparison.remediatedReport.scoreResult.score).toBeGreaterThanOrEqual(90);
    expect(comparison.remediatedReport.scoreResult.grade).toBe('A');
    expect(comparison.scoreDelta).toBeGreaterThan(40);
  });

  it('remediates every bundled sample preset to Grade A (score >= 90) upon re-audit', () => {
    for (const preset of SAMPLE_SNIPPETS) {
      const result = analyzeAndRemediate(preset.code);
      expect(result.remediatedReport.scoreResult.score).toBeGreaterThanOrEqual(90);
      expect(result.remediatedReport.scoreResult.grade).toBe('A');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/auditorAndRemediator.test.ts`
Expected: FAIL with module not found `../auditor`

- [ ] **Step 3: Implement `src/engine/remediator.ts` and `src/engine/auditor.ts`**

In `src/engine/remediator.ts`:
- Transform the input snippet line-by-line / element-by-element while preserving indentation and syntax mode (`html` vs `jsx`):
  - Wrap or upgrade top-level non-semantic `<div ...>` container to `<main ...>` when no landmark exists.
  - Add descriptive `alt="..."` to `<img>` lacking `alt`, clean redundant words (`image of`, `picture of`, `รูปภาพของ`) in existing `alt`, add `aria-label` to unlabeled `<svg>`, and add `<track kind="captions" ... />` to `<video>`/`<audio>`.
  - Add `<label htmlFor="..." / for="...">...</label>` and matching `id="..."` to unlabeled `<input>`, `<select>`, and `<textarea>`, and add descriptive text to empty `<button>`.
  - Normalize skipped heading levels (`<h3>` -> `<h1>` or sequential heading level) and convert header-less `<table>` first row `<td>` to `<th scope="col">`.
  - Convert `<div onClick=...>` / `<span onClick=...>` to `<button type="button" onClick=...>`, remove positive `tabIndex` (`tabIndex={2}` / `tabindex="2"`), add `href="#section"` to `<a>` without `href`, and replace vague link text (`คลิกที่นี่`, `click here`, `อ่านต่อ`) with descriptive text.

In `src/engine/auditor.ts`:
- Implement `auditCode(code: string): AuditReport` and `analyzeAndRemediate(code: string): ComparisonReport` which runs `auditCode(code)`, generates `remediatedCode = remediateCode(code)`, and runs `auditCode(remediatedCode)` to produce `remediatedReport`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/__tests__/auditorAndRemediator.test.ts`
Expected: PASS

---

### Task 5: Minimalist Responsive UI Components and Application Integration

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/StarRating.tsx`
- Create: `src/components/CodeComparisonWorkspace.tsx`
- Create: `src/components/CategorySummaryGrid.tsx`
- Create: `src/components/IssueBreakdownList.tsx`
- Create: `src/App.tsx`
- Test: `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `SITE_CONFIG`, `SAMPLE_SNIPPETS`, `analyzeAndRemediate`, `detectSyntaxMode`, `ComparisonReport`
- Produces: Complete interactive application in `src/App.tsx`

- [ ] **Step 1: Write the failing UI integration test in `src/__tests__/App.test.tsx`**

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Web Accessibility Inspector App', () => {
  it('shows dash (-) placeholders for scores, grades, and categories before clicking Analyze', () => {
    render(<App />);
    expect(screen.getByTestId('before-score-value').textContent).toBe('- / 100');
    expect(screen.getByTestId('before-grade-value').textContent).toBe('เกรด - (- ดาว)');
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
    expect(screen.getByTestId('after-grade-value').textContent).toBe('เกรด - (- ดาว)');
  });

  it('populates before score, remediated code, and re-audited after score when Analyze is clicked, and resets to (-) when preset changes', () => {
    render(<App />);
    const analyzeBtn = screen.getByTestId('analyze-button');
    fireEvent.click(analyzeBtn);

    expect(screen.getByTestId('before-score-value').textContent).not.toBe('- / 100');
    expect(screen.getByTestId('after-score-value').textContent).toBe('100 / 100');
    expect(screen.getByTestId('after-grade-value').textContent).toContain('เกรด A');
    expect(screen.getByTestId('remediated-code-box').textContent).toContain('<main');

    // Switching preset resets analysis state back to '-'
    const semanticPresetBtn = screen.getByTestId('preset-btn-semantic');
    fireEvent.click(semanticPresetBtn);
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/App.test.tsx`
Expected: FAIL with module not found `../App`

- [ ] **Step 3: Implement the UI components (`Header.tsx`, `StarRating.tsx`, `CodeComparisonWorkspace.tsx`, `CategorySummaryGrid.tsx`, `IssueBreakdownList.tsx`) and `src/App.tsx`**

Follow the approved `ui_mockup_v2.html` minimalist design:
- Light stone/slate palette (`bg-stone-50`, white cards with subtle borders), zero emojis, clean SVG icons for stars and copy actions.
- Left column: Original Code editor with line numbers and issue line highlighting (once analyzed), sample preset buttons, syntax mode badge (`HTML` vs `JSX`), Before Score/Grade/Star badge, and Analyze button.
- Right column: Remediated Code viewer with highlighted fixed lines, Re-audited After Score/Grade/Star badge, score improvement delta badge, "Copy Remediated Code" button, and "Apply to Input" button.
- Middle section: 4-category summary cards showing `-` before analysis and `ก่อนแก้ X ประเด็น -> หลังแก้ Y ประเด็น` after analysis.
- Bottom section: Filterable issue breakdown cards showing severity badge, deduction points, category, line number, WCAG criterion badge, impact reason, and side-by-side Original vs Suggested snippet with individual Copy button.

- [ ] **Step 4: Run all tests and production build to verify everything passes**

Run: `npx vitest run && npm run build`
Expected: All test suites PASS and `vite build` succeeds with zero TypeScript or bundle errors.
