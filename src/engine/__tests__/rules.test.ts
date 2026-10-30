import { describe, it, expect } from 'vitest';
import { parseMarkupWithLines } from '../jsxNormalizer';
import { runTextAlternativeRules } from '../rules/textAlternativeRules';
import { runFormControlRules } from '../rules/formControlRules';
import { runSemanticStructureRules } from '../rules/semanticStructureRules';
import { runAttributeNavigationRules } from '../rules/attributeNavigationRules';

describe('WCAG 4 Category Rule Modules', () => {
  describe('Category 1: Text Alternatives (text-alt)', () => {
    it('flags missing alt, filename/redundant alt, unlabeled svg, and video without track', () => {
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

    it('ignores decorative images with role="presentation", role="none", or aria-hidden', () => {
      const ctx = parseMarkupWithLines(`
        <div>
          <img src="/dec1.png" role="presentation" />
          <img src="/dec2.png" role="none" alt="" />
          <img src="/dec3.png" aria-hidden="true" />
          <img src="/dec4.png" aria-hidden="{true}" />
        </div>
      `);
      const issues = runTextAlternativeRules(ctx);
      expect(issues).toHaveLength(0);
    });

    it('detects redundant alt text in Thai and file extension endings', () => {
      const ctx = parseMarkupWithLines(`
        <div>
          <img src="/pic1.jpg" alt="รูปภาพของ ผู้บริหาร" />
          <img src="/pic2.jpg" alt="รูปของ แมว" />
          <img src="/pic3.jpg" alt="banner.jpeg" />
        </div>
      `);
      const issues = runTextAlternativeRules(ctx);
      expect(issues.filter((i) => i.ruleId === 'img-redundant-alt')).toHaveLength(3);
    });

    it('validates SVG with title tag, aria-label, or aria-hidden', () => {
      const ctx = parseMarkupWithLines(`
        <div>
          <svg><title>โลโก้บริษัท</title><path d="M0 0" /></svg>
          <svg aria-label="ค้นหา"><path d="M0 0" /></svg>
          <svg aria-hidden="true"><path d="M0 0" /></svg>
          <svg><path d="M0 0" /></svg>
        </div>
      `);
      const issues = runTextAlternativeRules(ctx);
      const svgIssues = issues.filter((i) => i.ruleId === 'svg-missing-name');
      expect(svgIssues).toHaveLength(1);
      expect(svgIssues[0].line).toBe(6);
    });

    it('passes compliant video with controls and captions track', () => {
      const ctx = parseMarkupWithLines(`
        <video controls src="/video.mp4">
          <track kind="captions" src="/captions.vtt" />
        </video>
      `);
      expect(runTextAlternativeRules(ctx)).toHaveLength(0);
    });
  });

  describe('Category 2: Form Controls & Labels (forms)', () => {
    it('flags input without label, recognizes htmlFor in JSX, and flags empty button', () => {
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

    it('flags placeholder-only inputs with moderate severity', () => {
      const ctx = parseMarkupWithLines(`
        <form>
          <input type="text" placeholder="พิมพ์ชื่อของคุณ" />
        </form>
      `);
      const issues = runFormControlRules(ctx);
      const placeholderIssue = issues.find((i) => i.ruleId === 'form-input-placeholder-only');
      expect(placeholderIssue).toBeDefined();
      expect(placeholderIssue?.severity).toBe('moderate');
    });

    it('handles wrapping label and aria-label properly', () => {
      const ctx = parseMarkupWithLines(`
        <form>
          <label>
            ชื่อผู้ใช้
            <input type="text" />
          </label>
          <input type="search" aria-label="ค้นหาสินค้า" />
          <select aria-label="เลือกจังหวัด"><option>กรุงเทพฯ</option></select>
          <textarea aria-label="ข้อความความคิดเห็น"></textarea>
        </form>
      `);
      expect(runFormControlRules(ctx)).toHaveLength(0);
    });

    it('ignores non-text input types like hidden, submit, button', () => {
      const ctx = parseMarkupWithLines(`
        <form>
          <input type="hidden" name="token" value="123" />
          <input type="submit" value="ส่งข้อมูล" />
          <input type="button" value="ยกเลิก" />
        </form>
      `);
      expect(runFormControlRules(ctx)).toHaveLength(0);
    });

    it('accepts button with text, image with alt, or SVG with label', () => {
      const ctx = parseMarkupWithLines(`
        <div>
          <button type="button">ตกลง</button>
          <button type="button"><img src="/icon.png" alt="พิมพ์เอกสาร" /></button>
          <button type="button"><svg aria-label="ปิดหน้าต่าง"></svg></button>
          <button type="button" aria-label="เมนูหลัก"></button>
        </div>
      `);
      expect(runFormControlRules(ctx)).toHaveLength(0);
    });
  });

  describe('Category 3: Semantic Structure (semantic)', () => {
    it('flags missing landmarks on div containers, skipped heading levels, and table without th', () => {
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

    it('passes when semantic landmarks like main, nav, header are used', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>หน้าแรก</h1>
          <section>
            <h2>เนื้อหาหลัก</h2>
            <p>ยินดีต้อนรับ</p>
          </section>
        </main>
      `);
      expect(runSemanticStructureRules(ctx)).toHaveLength(0);
    });

    it('detects multiple heading hierarchy violations correctly', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h2>ข้ามระดับ 1 (ไม่มี h1)</h2>
          <h4>ข้ามระดับ 2 (จาก h2 ไป h4)</h4>
        </main>
      `);
      const issues = runSemanticStructureRules(ctx);
      const headingIssues = issues.filter((i) => i.ruleId === 'heading-skipped-level');
      expect(headingIssues).toHaveLength(2);
    });

    it('allows heading level progression and returning to higher level', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>หัวข้อหลัก 1</h1>
          <h2>หัวข้อย่อย 1.1</h2>
          <h3>หัวข้อย่อย 1.1.1</h3>
          <h2>หัวข้อย่อย 1.2</h2>
          <h1>หัวข้อหลัก 2</h1>
        </main>
      `);
      expect(runSemanticStructureRules(ctx)).toHaveLength(0);
    });

    it('passes table when th headers exist', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>รายการสินค้า</h1>
          <table>
            <thead>
              <tr><th scope="col">ชื่อ</th><th scope="col">ราคา</th></tr>
            </thead>
            <tbody>
              <tr><td>สินค้า A</td><td>100</td></tr>
            </tbody>
          </table>
        </main>
      `);
      expect(runSemanticStructureRules(ctx)).toHaveLength(0);
    });
  });

  describe('Category 4: Attributes & Navigation (attributes)', () => {
    it('flags div with onClick, vague or href-less links, and positive tabIndex', () => {
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

    it('identifies various vague link phrases in Thai and English', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>บทความ</h1>
          <a href="/p1">click here</a>
          <a href="/p2">read more</a>
          <a href="/p3">ดูเพิ่มเติม</a>
          <a href="/p4">อ่านต่อ</a>
          <a href="/p5">รายละเอียด</a>
          <a href="/p6">ดูรายละเอียดหลักสูตร Web Accessibility</a>
        </main>
      `);
      const issues = runAttributeNavigationRules(ctx);
      const vagueIssues = issues.filter((i) => i.ruleId === 'link-vague-text');
      expect(vagueIssues).toHaveLength(5);
    });

    it('allows tabIndex 0 and -1 but flags positive tabIndex', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>การนำทาง</h1>
          <div tabIndex={0}>โฟกัสได้ปกติ</div>
          <div tabIndex={-1}>โฟกัสผ่านสคริปต์</div>
          <div tabIndex={1}>โฟกัสผิดลำดับ</div>
        </main>
      `);
      const issues = runAttributeNavigationRules(ctx);
      const tabIssues = issues.filter((i) => i.ruleId === 'tabindex-positive');
      expect(tabIssues).toHaveLength(1);
      expect(tabIssues[0].line).toBe(6);
    });

    it('flags empty href or href="#"', () => {
      const ctx = parseMarkupWithLines(`
        <main>
          <h1>ลิงก์</h1>
          <a href="#">ลิงก์แฮชเปล่า</a>
          <a href="">ลิงก์ว่าง</a>
        </main>
      `);
      const issues = runAttributeNavigationRules(ctx);
      const missingHrefIssues = issues.filter((i) => i.ruleId === 'link-missing-href');
      expect(missingHrefIssues).toHaveLength(2);
    });
  });

  describe('Zero Emojis and Quality Constraints', () => {
    it('ensures all audit issues contain zero emoji characters', () => {
      const ctx = parseMarkupWithLines(`
        <div class="card">
          <img src="/banner.jpg">
          <h3>ลงทะเบียนสมาชิกใหม่</h3>
          <input type="text" placeholder="ชื่อ-นามสกุล">
          <div onclick="submitForm()" tabindex="2">ส่งข้อมูล</div>
          <a href="/more">คลิกที่นี่</a>
          <a>ไม่มีปลายทาง</a>
          <video src="/video.mp4"></video>
          <table><tr><td>ไม่มี th</td></tr></table>
          <button type="button"></button>
        </div>
      `);
      const allIssues = [
        ...runTextAlternativeRules(ctx),
        ...runFormControlRules(ctx),
        ...runSemanticStructureRules(ctx),
        ...runAttributeNavigationRules(ctx),
      ];

      expect(allIssues.length).toBeGreaterThan(5);

      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const issue of allIssues) {
        expect(emojiRegex.test(issue.title)).toBe(false);
        expect(emojiRegex.test(issue.impactReason)).toBe(false);
        expect(emojiRegex.test(issue.suggestedSnippet)).toBe(false);
      }
    });

    it('produces syntaxMode-aware suggestions (htmlFor in JSX vs for in HTML)', () => {
      const jsxCtx = parseMarkupWithLines(`
        <div className="field">
          <input type="text" />
        </div>
      `);
      const htmlCtx = parseMarkupWithLines(`
        <div class="field">
          <input type="text">
        </div>
      `);

      const jsxIssues = runFormControlRules(jsxCtx);
      const htmlIssues = runFormControlRules(htmlCtx);

      expect(jsxIssues[0].suggestedSnippet).toContain('htmlFor=');
      expect(htmlIssues[0].suggestedSnippet).toContain('for=');
    });
  });
});
