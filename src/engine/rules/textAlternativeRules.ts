import { AuditIssue } from '../../types/accessibility';
import { ParsedMarkupContext } from '../jsxNormalizer';

const REDUNDANT_ALT_PATTERNS = [
  /\bimage\s+of\b/i,
  /\bpicture\s+of\b/i,
  /\bphoto\s+of\b/i,
  /รูปภาพของ/i,
  /รูปของ/i,
];

const FILE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i;

function cleanRedundantAlt(alt: string): string {
  let cleaned = alt;
  for (const pattern of REDUNDANT_ALT_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.replace(FILE_EXTENSION_PATTERN, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || 'คำอธิบายภาพที่ชัดเจน';
}

/**
 * Audits WCAG Category 1: Text Alternatives (text-alt)
 */
export function runTextAlternativeRules(ctx: ParsedMarkupContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { root, syntaxMode, getElementLine, getOriginalOuterSnippet } = ctx;

  // 1. Audit <img> elements
  const imgElements = Array.from(root.querySelectorAll('img'));
  imgElements.forEach((img, idx) => {
    const role = img.getAttribute('role');
    const ariaHidden = img.getAttribute('aria-hidden');
    const isDecorative =
      role === 'presentation' ||
      role === 'none' ||
      ariaHidden === 'true' ||
      ariaHidden === '{true}';

    const hasAlt = img.hasAttribute('alt');
    const altValue = img.getAttribute('alt') ?? '';
    const trimmedAlt = altValue.trim();

    if (!isDecorative && (!hasAlt || trimmedAlt === '')) {
      const line = getElementLine(img);
      const originalSnippet = getOriginalOuterSnippet(img);
      let suggestedSnippet: string;

      if (!hasAlt) {
        if (/\s*\/>\s*$/.test(originalSnippet)) {
          suggestedSnippet = originalSnippet.replace(/\s*\/>\s*$/, ' alt="คำอธิบายภาพ" />');
        } else if (/\s*>\s*$/.test(originalSnippet)) {
          suggestedSnippet = originalSnippet.replace(/\s*>\s*$/, ' alt="คำอธิบายภาพ">');
        } else {
          suggestedSnippet = `${originalSnippet} alt="คำอธิบายภาพ"`;
        }
      } else {
        const emptyAltPattern = /\balt=(?:(["'])\s*\1|\{(?:["']\s*["']|\s*)\})/;
        if (emptyAltPattern.test(originalSnippet)) {
          suggestedSnippet = originalSnippet.replace(emptyAltPattern, 'alt="คำอธิบายภาพ"');
        } else {
          suggestedSnippet = originalSnippet
            .replace(/alt=""/, 'alt="คำอธิบายภาพ"')
            .replace(/alt=\{""\}/, 'alt="คำอธิบายภาพ"')
            .replace(/alt=\{''\}/, 'alt="คำอธิบายภาพ"');
        }
      }

      issues.push({
        id: `img-missing-alt-${line}-${idx}`,
        ruleId: 'img-missing-alt',
        category: 'text-alt',
        severity: 'critical',
        line,
        wcagCriterion: 'WCAG 1.1.1 (Non-text Content)',
        title: 'รูปภาพไม่มีคำอธิบาย (alt)',
        impactReason:
          'ผู้ใช้งานโปรแกรมอ่านจอภาพ (Screen Reader) จะไม่สามารถรับรู้ความหมายหรือเนื้อหาของรูปภาพนี้ได้หากไม่มีแอตทริบิวต์ alt',
        originalSnippet,
        suggestedSnippet,
      });
    } else if (hasAlt && trimmedAlt !== '') {
      const hasRedundantText = REDUNDANT_ALT_PATTERNS.some((p) => p.test(altValue));
      const hasFileExt = FILE_EXTENSION_PATTERN.test(trimmedAlt) || /\.(jpe?g|png|gif|webp|svg|avif)\b/i.test(altValue);

      if (hasRedundantText || hasFileExt) {
        const line = getElementLine(img);
        const originalSnippet = getOriginalOuterSnippet(img);
        const cleaned = cleanRedundantAlt(trimmedAlt);
        const suggestedSnippet = originalSnippet.replace(
          new RegExp(`alt=(["'])${escapeRegExp(altValue)}\\1`),
          `alt="${cleaned}"`
        );

        issues.push({
          id: `img-redundant-alt-${line}-${idx}`,
          ruleId: 'img-redundant-alt',
          category: 'text-alt',
          severity: 'minor',
          line,
          wcagCriterion: 'WCAG 1.1.1 (Non-text Content)',
          title: 'คำอธิบายรูปภาพ (alt) มีคำฟุ่มเฟือยหรือชื่อไฟล์',
          impactReason:
            'โปรแกรมอ่านจอภาพจะแจ้งประเภทว่าเป็นรูปภาพให้อัตโนมัติอยู่แล้ว การใส่คำว่า "image of" หรือนามสกุลไฟล์ทำให้ข้อมูลซ้ำซ้อน',
          originalSnippet,
          suggestedSnippet,
        });
      }
    }
  });

  // 2. Audit <svg> elements
  const svgElements = Array.from(root.querySelectorAll('svg'));
  svgElements.forEach((svg, idx) => {
    const role = svg.getAttribute('role');
    const ariaHidden = svg.getAttribute('aria-hidden');
    const isDecorative =
      role === 'presentation' ||
      role === 'none' ||
      ariaHidden === 'true' ||
      ariaHidden === '{true}';

    if (isDecorative) {
      return;
    }

    const ariaLabel = svg.getAttribute('aria-label')?.trim();
    const ariaLabelledby = svg.getAttribute('aria-labelledby')?.trim();
    const titleTag = svg.querySelector('title')?.textContent?.trim();

    if (!ariaLabel && !ariaLabelledby && !titleTag) {
      const line = getElementLine(svg);
      const originalSnippet = getOriginalOuterSnippet(svg);
      const suggestedSnippet = originalSnippet.startsWith('<svg')
        ? originalSnippet.replace('<svg', '<svg aria-label="ไอคอน"')
        : `<svg aria-label="ไอคอน">${originalSnippet}</svg>`;

      issues.push({
        id: `svg-missing-name-${line}-${idx}`,
        ruleId: 'svg-missing-name',
        category: 'text-alt',
        severity: 'moderate',
        line,
        wcagCriterion: 'WCAG 1.1.1 (Non-text Content)',
        title: 'กราฟิก SVG ไม่มีชื่อหรือคำอธิบายที่เข้าถึงได้ (Accessible Name)',
        impactReason:
          'ผู้ใช้งาน Screen Reader จะไม่สามารถรับรู้หน้าที่หรือความหมายของไอคอนกราฟิก SVG นี้ได้หากไม่มี aria-label หรือแท็ก <title>',
        originalSnippet,
        suggestedSnippet,
      });
    }
  });

  // 3. Audit <video> and <audio> elements
  const mediaElements = Array.from(root.querySelectorAll('video, audio'));
  mediaElements.forEach((media, idx) => {
    const tagName = media.tagName.toLowerCase();
    const hasTrack = !!media.querySelector('track[kind="captions"], track[kind="subtitles"]');
    const hasControls =
      media.hasAttribute('controls') ||
      media.getAttribute('controls') === 'true' ||
      media.getAttribute('controls') === '{true}';

    if (!hasTrack || !hasControls) {
      const line = getElementLine(media);
      const originalSnippet = getOriginalOuterSnippet(media);
      const trackSnippet =
        syntaxMode === 'jsx'
          ? '<track kind="captions" src="/captions.vtt" srcLang="th" label="ภาษาไทย" default />'
          : '<track kind="captions" src="/captions.vtt" srclang="th" label="ภาษาไทย" default>';

      let suggestedSnippet = originalSnippet;
      if (!hasControls) {
        suggestedSnippet = suggestedSnippet.replace(new RegExp(`^<${tagName}`), `<${tagName} controls`);
      }
      if (!hasTrack) {
        if (suggestedSnippet.includes(`</${tagName}>`)) {
          suggestedSnippet = suggestedSnippet.replace(
            new RegExp(`</${tagName}>$`),
            `  ${trackSnippet}\n</${tagName}>`
          );
        } else {
          suggestedSnippet = `${suggestedSnippet}\n  ${trackSnippet}\n</${tagName}>`;
        }
      }

      issues.push({
        id: `media-missing-track-${line}-${idx}`,
        ruleId: 'media-missing-track',
        category: 'text-alt',
        severity: 'moderate',
        line,
        wcagCriterion: 'WCAG 1.2.2 (Captions Prerecorded)',
        title: `สื่อมัลติมีเดีย (${tagName}) ไม่มีแทร็กคำบรรยายหรือปุ่มควบคุม`,
        impactReason:
          'ผู้ใช้งานที่มีความบกพร่องทางการได้ยินจะไม่สามารถเข้าถึงเนื้อหาเสียงในสื่อวิดีโอ/เสียงได้หากไม่มีคำบรรยายแทนเสียง',
        originalSnippet,
        suggestedSnippet,
      });
    }
  });

  return issues;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
