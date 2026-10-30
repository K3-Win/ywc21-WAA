# Web Accessibility Inspector — Design Specification

## 1. Intent & Goals
Build a client-side **Web Accessibility Inspector** web application in React + TypeScript + Tailwind CSS (via Vite) that audits HTML and JSX code snippets against WCAG 2.1/2.2 guidelines without external AI or server dependencies. The engine inspects 4 rule categories, calculates a weighted score/grade/star rating, generates a full remediated code output preserving the user's original syntax (HTML vs JSX), and re-audits the remediated code to verify and display the post-remediation score.

### Goals
- Parse both HTML and JSX snippets accurately on the client side, tracking line numbers and syntax flavor (`html` vs `jsx`).
- Audit across 4 WCAG categories:
  1. Text Alternatives (`text-alt`)
  2. Form Controls & Labels (`forms`)
  3. Semantic Structure & Heading Hierarchy (`semantic`)
  4. Attributes, Roles & Navigation (`attributes`)
- Categorize issues into 3 severity levels (`critical`: -20, `moderate`: -10, `minor`: -5) starting from 100 points (minimum 0), mapping scores to grades (`A`/`B`/`C`/`D`/`F`) and star ratings (`1`–`5` stars).
- Provide sample code preset buttons (Passing code, Critical issues, Missing semantics, JSX Form & Interactive issues).
- Split layout (Left: Original Code Input & Before Score; Right: Remediated Code Output & Re-Audited After Score) on desktop, stacking cleanly on mobile.
- Before clicking "Analyze", all score, grade, star, and category count fields display `-` (un-analyzed state). Editing code or switching presets resets the analysis state back to `-` until the user clicks Analyze.
- Keep all static copy, logo text, scoring thresholds, and sample snippets centralized in configuration files (`src/config/siteConfig.ts` and `src/config/sampleSnippets.ts`) so the user can edit them easily later.

### Non-Goals & Anti-Goals
- **No Emojis:** Zero emojis anywhere in the UI, presets, badges, or messages. Use clean typography and minimalist SVG icons where needed.
- **No AI / External APIs:** 100% deterministic rule-based engine running locally in the browser.
- **No User-Facing Score Config Sliders:** Scoring weights and grade thresholds are fixed in `src/config/siteConfig.ts`, not adjustable by end-users in the UI.
- **No Live Audit Before Button Click:** Auditing only runs when the user explicitly clicks the Analyze button.

## 2. Approaches Considered
1. **React + TypeScript + Vite + Tailwind CSS with JSX-Normalized DOM Parser (Selected):**
   - Combines strong TypeScript typing for WCAG rules, clean component modularization, and a lightweight preprocessor that normalizes JSX (`className`, `htmlFor`, `{...}`, self-closing tags, fragments) before DOM traversal while keeping line numbers intact.
2. **Vanilla HTML/JS Single File:**
   - Zero build step, but harder to maintain modular WCAG rules, tests, and editable config files.
3. **Full AST Compiler (`@babel/parser`):**
   - Heavy bundle size and fails completely on partial or slightly malformed HTML snippets.

## 3. Architecture & File Structure
- `src/types/accessibility.ts`: Core types (`SyntaxMode`, `SeverityLevel`, `CategoryId`, `AuditIssue`, `CategorySummary`, `ScoreResult`, `AuditReport`, `ComparisonReport`).
- `src/config/siteConfig.ts`: All static text, branding/logo text, category titles, severity deduction weights, and grade/star thresholds.
- `src/config/sampleSnippets.ts`: Pre-configured sample HTML and JSX code snippets for quick testing.
- `src/engine/jsxNormalizer.ts`: Detects HTML vs JSX syntax, maps element positions to 1-based line numbers, and normalizes JSX constructs (`<div />`, `<>...</>`, `{expr}`) so `DOMParser` can parse them cleanly while preserving original attributes and snippets.
- `src/engine/rules/`:
  - `textAlternativeRules.ts` (Category 1: `<img>` missing/empty/redundant `alt`, `<svg>` without accessible name, `<video>`/`<audio>` missing `<track>`).
  - `formControlRules.ts` (Category 2: `<input>`/`<select>`/`<textarea>` missing `<label>` or `for`/`htmlFor` binding, placeholder-only inputs, empty `<button>`).
  - `semanticStructureRules.ts` (Category 3: non-semantic `<div>` soup without landmarks, skipped heading levels `h1`–`h6` or missing `h1`, `<table>` missing `<th>`).
  - `attributeNavigationRules.ts` (Category 4: clickable `<div>`/`<span>` with `onClick`/`onclick` lacking button semantics, `<a>` missing `href` or using vague link text, positive `tabIndex > 0`, invalid `role` or `aria-*` values).
- `src/engine/scoring.ts`: Calculates score (0–100), grade (`A`–`F`), star rating (`1`–`5`), and category/severity counts from a list of issues using `siteConfig`.
- `src/engine/remediator.ts`: Applies deterministic code fixes to the original snippet (respecting HTML vs JSX syntax) to produce a full remediated code string.
- `src/engine/auditor.ts`: Orchestrates `auditCode(code)` and `analyzeAndRemediate(code)` (which audits the original code, generates the remediated code, and runs `auditCode(remediatedCode)` to produce the verified after-score).
- `src/components/`:
  - `Header.tsx`: Minimalist header reading branding from `siteConfig`.
  - `CodeComparisonWorkspace.tsx`: Left (original input + presets + before score badge + analyze button) and Right (remediated code + re-audited score badge + copy button), showing `-` when un-analyzed.
  - `CategorySummaryGrid.tsx`: 4-card breakdown comparing before vs after issue counts per WCAG category.
  - `IssueBreakdownList.tsx`: Detailed issue cards with severity badge, line number, WCAG criterion, impact explanation, and before/after snippet diff with copy button.
