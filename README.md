# Web Accessibility Inspector

A client-side HTML and JSX accessibility auditing and auto-remediation tool built with React, TypeScript, and Tailwind CSS. It inspects markup against WCAG 2.1/2.2 guidelines in the browser, computes severity-weighted scores, generates syntax-aware remediated code, and re-audits the fixed output to verify score improvements.

## Features

- **Client-Side Execution:** Runs entirely in the browser with no backend server or external API calls.
- **HTML & JSX Support:** Preprocesses both standard HTML (`class`, `for`, `onclick`) and JSX (`className`, `htmlFor`, `onClick`, expressions `{...}`, fragments `<>...</>`, self-closing non-void tags) while preserving 1-based line numbers.
- **4-Category WCAG Auditing:** Evaluates markup across Text Alternatives, Form Controls & Labels, Semantic Structure, and Attributes & Navigation.
- **Dynamic Scoring:** Deducts points per issue severity and maps totals to letter grades (`A`–`F`) and star ratings (`1`–`5`).
- **Auto-Remediation & Re-Audit:** Generates a full remediated code output matching the original syntax mode (`html` or `jsx`) and passes it back through the auditing engine to verify the post-fix score.
- **Interactive Workspace:** Side-by-side comparison view (responsive stacking on mobile), sample preset loader, category/severity filters, and snippet copy actions.

## Auditing Rules

1. **Text Alternatives (`text-alt`)**
   - `<img>` missing `alt` or empty `alt` on non-decorative images (WCAG 1.1.1)
   - `<img>` with redundant `alt` phrasing or file extensions (WCAG 1.1.1)
   - `<svg>` missing an accessible name (`<title>`, `aria-label`, or `aria-labelledby`) when not marked decorative (WCAG 1.1.1)
   - `<video>` and `<audio>` missing `<track kind="captions">` or `controls` (WCAG 1.2.2)

2. **Form Controls & Labels (`forms`)**
   - `<input>`, `<select>`, and `<textarea>` missing an associated `<label>` (`for` / `htmlFor`, enclosing `<label>`, `aria-label`, or `aria-labelledby`) (WCAG 1.3.1, 3.3.2)
   - Form inputs relying solely on `placeholder` without a label (WCAG 3.3.2)
   - Empty `<button>` elements without text content or an accessible label (WCAG 4.1.2)

3. **Semantic Structure (`semantic`)**
   - `<div>` containers lacking semantic landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<section>`, `<article>`) (WCAG 1.3.1, 2.4.1)
   - Skipped heading levels in `<h1>`–`<h6>` hierarchy (WCAG 1.3.1, 2.4.6)
   - `<table>` elements missing `<th>` header cells (WCAG 1.3.1)

4. **Attributes & Navigation (`attributes`)**
   - Interactive `<div>` or `<span>` elements with `onClick`/`onclick` lacking button semantics (WCAG 2.1.1, 4.1.2)
   - Positive `tabIndex` values (`> 0`) that disrupt natural keyboard focus order (WCAG 2.4.3)
   - `<a>` elements missing a valid `href` attribute (WCAG 2.1.1, 4.1.2)
   - `<a>` elements using vague link text (WCAG 2.4.4)

## Scoring System

- **Base Score:** `100` (clamped to `[0, 100]`)
- **Severity Deductions:**
  - `critical`: `-20`
  - `moderate`: `-10`
  - `minor`: `-5`

| Score Range | Grade | Stars | Label |
|---|---|---|---|
| `90 – 100` | `A` | 5 | Excellent |
| `80 – 89` | `B` | 4 | Good |
| `70 – 79` | `C` | 3 | Fair |
| `60 – 69` | `D` | 2 | Poor |
| `0 – 59` | `F` | 1 | Failing |

## Tech Stack

- **Framework:** React 18, TypeScript 5.7
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React
- **Testing:** Vitest, Testing Library, JSDOM

## Getting Started

### Prerequisites

- Node.js and npm

### Installation & Scripts

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Run the test suite:
   ```bash
   npm test
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build locally:
   ```bash
   npm run preview
   ```

## Project Structure

```text
src/
├── components/
│   ├── CategorySummaryGrid.tsx
│   ├── CodeComparisonWorkspace.tsx
│   ├── Header.tsx
│   ├── IssueBreakdownList.tsx
│   └── StarRating.tsx
├── config/
│   ├── sampleSnippets.ts
│   └── siteConfig.ts
├── engine/
│   ├── rules/
│   │   ├── attributeNavigationRules.ts
│   │   ├── formControlRules.ts
│   │   ├── semanticStructureRules.ts
│   │   └── textAlternativeRules.ts
│   ├── auditor.ts
│   ├── jsxNormalizer.ts
│   ├── remediator.ts
│   └── scoring.ts
├── types/
│   └── accessibility.ts
├── App.tsx
├── index.css
└── main.tsx
```
