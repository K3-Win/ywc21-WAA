import { describe, it, expect } from 'vitest';
import { detectSyntaxMode, parseMarkupWithLines } from '../jsxNormalizer';
import { calculateScore } from '../scoring';
import { AuditIssue } from '../../types/accessibility';

describe('jsxNormalizer', () => {
  it('detects JSX syntax from className, htmlFor, or brace expressions', () => {
    expect(detectSyntaxMode('<div className="box"><label htmlFor="a">A</label></div>')).toBe('jsx');
    expect(detectSyntaxMode('<div class="box"><label for="a">A</label></div>')).toBe('html');
    expect(detectSyntaxMode('<button onClick={handleClick}>Click</button>')).toBe('jsx');
    expect(detectSyntaxMode('<><span>Fragment</span></>')).toBe('jsx');
    expect(detectSyntaxMode('<div><p>Simple HTML</p></div>')).toBe('html');
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

  it('handles JSX fragments without breaking DOM structure', () => {
    const code = [
      '<>',
      '  <h1>Heading</h1>',
      '  <p>Paragraph</p>',
      '</>',
    ].join('\n');
    const parsed = parseMarkupWithLines(code);
    expect(parsed.syntaxMode).toBe('jsx');
    const h1 = parsed.root.querySelector('h1');
    const p = parsed.root.querySelector('p');
    expect(h1).not.toBeNull();
    expect(p).not.toBeNull();
    expect(parsed.getElementLine(h1!)).toBe(2);
    expect(parsed.getElementLine(p!)).toBe(3);
  });

  it('returns original outer snippet for an element', () => {
    const code = [
      '<main>',
      '  <img src="pic.jpg">',
      '</main>',
    ].join('\n');
    const parsed = parseMarkupWithLines(code);
    const img = parsed.root.querySelector('img');
    expect(img).not.toBeNull();
    const snippet = parsed.getOriginalOuterSnippet(img!);
    expect(snippet).toContain('<img src="pic.jpg">');
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
    expect(res.deductions).toBe(30);
  });

  it('returns 100 with grade A and 5 stars when there are no issues', () => {
    const res = calculateScore([]);
    expect(res.score).toBe(100);
    expect(res.grade).toBe('A');
    expect(res.stars).toBe(5);
    expect(res.deductions).toBe(0);
  });

  it('clamps minimum score to 0 and assigns grade F and 1 star for heavy penalties', () => {
    const mockIssues: AuditIssue[] = Array.from({ length: 6 }).map((_, i) => ({
      id: String(i),
      ruleId: 'img-alt',
      category: 'text-alt',
      severity: 'critical',
      line: i + 1,
      wcagCriterion: 'WCAG 1.1.1',
      title: 'Missing alt',
      impactReason: 'Reason',
      originalSnippet: '<img src="a.jpg">',
      suggestedSnippet: '<img src="a.jpg" alt="คำอธิบายภาพ">',
    }));
    const res = calculateScore(mockIssues);
    expect(res.score).toBe(0);
    expect(res.grade).toBe('F');
    expect(res.stars).toBe(1);
    expect(res.deductions).toBe(120);
  });

  it('deducts 5 points for minor severity issues', () => {
    const mockIssues: AuditIssue[] = [
      {
        id: '1',
        ruleId: 'target-blank',
        category: 'attributes',
        severity: 'minor',
        line: 1,
        wcagCriterion: 'WCAG 4.1.2',
        title: 'Target blank missing rel',
        impactReason: 'Reason',
        originalSnippet: '<a href="https://example.com" target="_blank">Link</a>',
        suggestedSnippet: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
      },
    ];
    const res = calculateScore(mockIssues);
    expect(res.score).toBe(95);
    expect(res.grade).toBe('A');
    expect(res.stars).toBe(5);
    expect(res.deductions).toBe(5);
  });
});
