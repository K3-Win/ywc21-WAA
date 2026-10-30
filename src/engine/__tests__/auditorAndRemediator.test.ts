import { describe, it, expect } from 'vitest';
import { auditCode, analyzeAndRemediate } from '../auditor';
import { remediateCode } from '../remediator';
import { SAMPLE_SNIPPETS } from '../../config/sampleSnippets';

describe('auditor and remediator', () => {
  it('handles empty or whitespace-only input safely by marking isEmpty=true', () => {
    const report = auditCode('   \n  ');
    expect(report.isEmpty).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.scoreResult.score).toBe(100);
    expect(report.scoreResult.grade).toBe('A');
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

  it('preserves HTML syntax mode and converts div-soup to main landmark', () => {
    const htmlSnippet = [
      '<div class="wrapper">',
      '  <img src="/hero.png">',
      '  <h3>ข่าวสารล่าสุด</h3>',
      '  <input type="text" placeholder="ระบุคำค้น">',
      '  <div onclick="doSearch()">ค้นหา</div>',
      '</div>',
    ].join('\n');

    const remediated = remediateCode(htmlSnippet);
    expect(remediated).toContain('<main class="wrapper">');
    expect(remediated).toContain('</main>');
    expect(remediated).toContain('for="');
    expect(remediated).toContain('alt="คำอธิบายภาพ"');
    expect(remediated).toContain('<button type="button" onclick="doSearch()">ค้นหา</button>');

    const report = auditCode(remediated);
    expect(report.scoreResult.score).toBeGreaterThanOrEqual(90);
  });

  it('remediates vague link text, missing href, and tables without th', () => {
    const snippet = [
      '<main>',
      '  <h1>หัวข้อหลัก</h1>',
      '  <a>คลิกที่นี่</a>',
      '  <table>',
      '    <tr><td>ชื่อ</td><td>ราคา</td></tr>',
      '    <tr><td>สมุด</td><td>20</td></tr>',
      '  </table>',
      '</main>',
    ].join('\n');

    const remediated = remediateCode(snippet);
    expect(remediated).toContain('href="#section"');
    expect(remediated).toContain('อ่านรายละเอียด');
    expect(remediated).toContain('<th scope="col">ชื่อ</th>');

    const report = auditCode(remediated);
    expect(report.scoreResult.score).toBeGreaterThanOrEqual(90);
  });

  it('cleans redundant alt text prefixes and adds accessible labels to svg', () => {
    const snippet = [
      '<main>',
      '  <h1>คลังรูปภาพ</h1>',
      '  <img src="/banner.jpg" alt="รูปภาพของ ผู้จัดการ" />',
      '  <svg><path d="M0 0" /></svg>',
      '</main>',
    ].join('\n');

    const remediated = remediateCode(snippet);
    expect(remediated).not.toContain('รูปภาพของ');
    expect(remediated).toContain('alt="ผู้จัดการ"');
    expect(remediated).toContain('aria-label=');

    const report = auditCode(remediated);
    expect(report.scoreResult.score).toBeGreaterThanOrEqual(90);
  });

  it('remediates empty button and video missing captions track', () => {
    const snippet = [
      '<main>',
      '  <h1>สื่อวิดีโอ</h1>',
      '  <video src="/intro.mp4"></video>',
      '  <button type="button"></button>',
      '</main>',
    ].join('\n');

    const remediated = remediateCode(snippet);
    expect(remediated).toContain('controls');
    expect(remediated).toContain('<track kind="captions"');
    expect(remediated).toContain('>ข้อความปุ่ม</button>');

    const report = auditCode(remediated);
    expect(report.scoreResult.score).toBeGreaterThanOrEqual(90);
  });
});
