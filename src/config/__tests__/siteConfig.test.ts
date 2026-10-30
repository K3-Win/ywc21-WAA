import { describe, it, expect } from 'vitest';
import { SITE_CONFIG } from '../siteConfig';
import { SAMPLE_SNIPPETS } from '../sampleSnippets';

describe('siteConfig and sampleSnippets', () => {
  it('defines exact severity penalties and 5 grade thresholds correctly', () => {
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
