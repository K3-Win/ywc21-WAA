import { detectSyntaxMode } from './jsxNormalizer';

const REDUNDANT_ALT_PATTERNS = [
  /\bimage\s+of\b/i,
  /\bpicture\s+of\b/i,
  /\bphoto\s+of\b/i,
  /รูปภาพของ/i,
  /รูปของ/i,
];

const FILE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i;

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

const LANDMARK_TAG_REGEX = /<(main|nav|header|footer|aside|section|article)\b/i;
const LANDMARK_ROLE_REGEX = /role=["'](main|navigation|banner|contentinfo|complementary|region)["']/i;

function cleanRedundantAltText(alt: string): string {
  let cleaned = alt;
  for (const pattern of REDUNDANT_ALT_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.replace(FILE_EXTENSION_PATTERN, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || 'คำอธิบายภาพที่ชัดเจน';
}

/**
 * Removes positive tabIndex attributes (> 0) that disrupt keyboard focus order.
 */
function removePositiveTabIndex(code: string): string {
  return code
    .replace(/\s+\btabIndex=\{[1-9]\d*\}/g, '')
    .replace(/\s+\btabIndex=["'][1-9]\d*["']/g, '')
    .replace(/\s+\btabindex=["'][1-9]\d*["']/g, '');
}

/**
 * Converts interactive non-semantic containers (<div onClick=...>, <span onClick=...>)
 * to accessible <button type="button" ...>.
 */
function remediateClickableContainers(code: string, isJsx: boolean): string {
  const clickEventRegex = isJsx ? /\bonClick\s*=/ : /\bonclick\s*=/i;
  const lines = code.split('\n');
  const resultLines: string[] = [];

  for (let line of lines) {
    // Check single-line clickable div or span
    const singleLineMatch = line.match(/^(\s*)<(\bdiv|\bspan|\bp)\b([^>]*)>(.*?)<\/\2>(\s*)$/i);
    if (singleLineMatch) {
      const [, indent, , attrs, content, trailing] = singleLineMatch;
      if (clickEventRegex.test(attrs) || /role=["']button["']/i.test(attrs)) {
        let cleanAttrs = attrs
          .replace(/\s*role=["']button["']/gi, '')
          .replace(/\s*tabIndex=\{[0-9]+\}/gi, '')
          .replace(/\s*tabindex=["'][0-9]+["']/gi, '');

        if (isJsx) {
          cleanAttrs = cleanAttrs.replace(/\bonclick=/g, 'onClick=');
        } else {
          cleanAttrs = cleanAttrs.replace(/\bonClick=/g, 'onclick=');
        }

        const buttonTag = `<button type="button"${cleanAttrs}>${content}</button>`;
        resultLines.push(`${indent}${buttonTag}${trailing}`);
        continue;
      }
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
}

/**
 * Ensures landmark regions exist. Converts top-level <div> to <main> if no landmark exists.
 */
function remediateLandmarks(code: string): string {
  const hasLandmark = LANDMARK_TAG_REGEX.test(code) || LANDMARK_ROLE_REGEX.test(code);
  if (hasLandmark) {
    return code;
  }

  const lines = code.split('\n');
  let firstDivLineIndex = -1;
  let lastDivLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (firstDivLineIndex === -1 && /^<div\b/i.test(trimmed)) {
      firstDivLineIndex = i;
    }
    if (/^<\/div>$/i.test(trimmed) || /<\/div>\s*$/i.test(trimmed)) {
      lastDivLineIndex = i;
    }
  }

  if (firstDivLineIndex !== -1 && lastDivLineIndex !== -1) {
    if (firstDivLineIndex === lastDivLineIndex) {
      lines[firstDivLineIndex] = lines[firstDivLineIndex]
        .replace(/^(\s*)<div\b/i, '$1<main')
        .replace(/<\/div>(\s*)$/i, '</main>$1');
      return lines.join('\n');
    }
    lines[firstDivLineIndex] = lines[firstDivLineIndex].replace(/^(\s*)<div\b/i, '$1<main');
    lines[lastDivLineIndex] = lines[lastDivLineIndex].replace(/<\/div>(\s*)$/i, '</main>$1');
    return lines.join('\n');
  }

  if (firstDivLineIndex !== -1) {
    lines[firstDivLineIndex] = lines[firstDivLineIndex].replace(/^(\s*)<div\b/i, '$1<main');
    return lines.join('\n');
  }

  // If no div exists, wrap with main landmark
  return `<main>\n${code}\n</main>`;
}

/**
 * Remediates <img> elements by adding missing alt attributes or cleaning redundant alt text.
 */
function remediateImages(code: string): string {
  return code.replace(/<img\b([^>]*)>/gi, (match, attrs: string) => {
    // Check if decorative
    const isDecorative =
      /\brole=["'](?:presentation|none)["']/i.test(attrs) ||
      /\baria-hidden=["']?\{?true\}?["']?/i.test(attrs);

    if (isDecorative) {
      return match;
    }

    // Check for existing alt attribute
    const altMatch = attrs.match(/\balt=(?:(["'])(.*?)\1|\{([`'"])(.*?)\3\})/i);
    if (altMatch) {
      const rawAlt = altMatch[2] ?? altMatch[4] ?? '';
      const trimmedAlt = rawAlt.trim();

      if (trimmedAlt === '') {
        return match.replace(altMatch[0], 'alt="คำอธิบายภาพ"');
      }

      // Check redundant patterns or file extension
      const hasRedundant = REDUNDANT_ALT_PATTERNS.some((p) => p.test(rawAlt));
      const hasFileExt = FILE_EXTENSION_PATTERN.test(trimmedAlt);

      if (hasRedundant || hasFileExt) {
        const cleaned = cleanRedundantAltText(rawAlt);
        return match.replace(altMatch[0], `alt="${cleaned}"`);
      }

      return match;
    }

    // Missing alt attribute completely
    if (/\s*\/>\s*$/.test(match)) {
      return match.replace(/\s*\/>\s*$/, ' alt="คำอธิบายภาพ" />');
    }
    if (/\s*>\s*$/.test(match)) {
      return match.replace(/\s*>\s*$/, ' alt="คำอธิบายภาพ">');
    }
    return match;
  });
}

/**
 * Remediates headings to ensure sequential hierarchy starting from h1.
 */
function remediateHeadings(code: string): string {
  let prevLevel = 0;

  return code.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, levelStr, attrs, content) => {
    const currentLevel = parseInt(levelStr, 10);
    let targetLevel = currentLevel;

    if (prevLevel === 0) {
      if (currentLevel > 1) {
        targetLevel = 1;
      }
    } else {
      if (currentLevel > prevLevel + 1) {
        targetLevel = prevLevel + 1;
      }
    }

    prevLevel = targetLevel;

    if (targetLevel !== currentLevel) {
      return `<h${targetLevel}${attrs}>${content}</h${targetLevel}>`;
    }
    return match;
  });
}

/**
 * Converts header-less <table> first row <td> cells to <th scope="col">.
 */
function remediateTables(code: string): string {
  return code.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (tableMatch, tableAttrs, tableInner) => {
    // If table already has <th>, leave unchanged
    if (/<th\b/i.test(tableInner)) {
      return tableMatch;
    }

    // Convert first <tr> <td> to <th scope="col">
    let replacedFirstRow = false;
    const modifiedInner = tableInner.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/i, (rowMatch: string, rowAttrs: string, rowContent: string) => {
      if (replacedFirstRow) {
        return rowMatch;
      }
      replacedFirstRow = true;
      const convertedContent = rowContent
        .replace(/<td\b([^>]*)>/gi, '<th scope="col"$1>')
        .replace(/<\/td>/gi, '</th>');
      return `<tr${rowAttrs}>${convertedContent}</tr>`;
    });

    return `<table${tableAttrs}>${modifiedInner}</table>`;
  });
}

/**
 * Remediates form controls by adding associated <label> elements and IDs.
 */
function remediateFormControls(code: string, isJsx: boolean): string {
  const existingIds = new Set<string>();
  const idRegex = /\bid=["']([^"']+)["']/gi;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = idRegex.exec(code)) !== null) {
    existingIds.add(idMatch[1]);
  }

  // Check if labels already exist
  const existingLabels = new Set<string>();
  const labelForRegex = isJsx
    ? /\bhtmlFor=["']([^"']+)["']/gi
    : /\bfor=["']([^"']+)["']/gi;
  let lblMatch: RegExpExecArray | null;
  while ((lblMatch = labelForRegex.exec(code)) !== null) {
    existingLabels.add(lblMatch[1]);
  }

  const lines = code.split('\n');
  const resultLines: string[] = [];
  let generatedCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const controlMatch = line.match(/^(\s*)<(\binput|\bselect|\btextarea)\b([^>]*)>(\s*)$/i) ||
      line.match(/^(\s*)<(\binput|\bselect|\btextarea)\b([^>]*)\/>(\s*)$/i);

    if (controlMatch) {
      const [, indent, tag, attrs] = controlMatch;
      const lowerTag = tag.toLowerCase();

      // Exclude hidden, submit, button, image, reset
      if (lowerTag === 'input') {
        const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
        const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';
        if (['hidden', 'submit', 'button', 'image', 'reset'].includes(inputType)) {
          resultLines.push(line);
          continue;
        }
      }

      // Check aria-label or aria-labelledby
      if (/\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs)) {
        resultLines.push(line);
        continue;
      }

      // Check existing id
      const existingIdMatch = attrs.match(/\bid=["']([^"']+)["']/i);
      let elementId = existingIdMatch ? existingIdMatch[1] : '';

      if (elementId && existingLabels.has(elementId)) {
        // Already has associated label
        resultLines.push(line);
        continue;
      }

      // Determine appropriate ID
      if (!elementId) {
        const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
        const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';
        const placeholderMatch = attrs.match(/\bplaceholder=["']([^"']+)["']/i);
        const placeholder = placeholderMatch ? placeholderMatch[1].toLowerCase() : '';

        if (inputType === 'email' || placeholder.includes('email') || placeholder.includes('อีเมล')) {
          elementId = 'user-email';
        } else if (inputType === 'password') {
          elementId = 'user-password';
        } else if (inputType === 'search') {
          elementId = 'search-input';
        } else if (inputType === 'tel') {
          elementId = 'user-tel';
        } else if (placeholder.includes('ชื่อ') || placeholder.includes('name')) {
          elementId = 'user-name';
        } else if (lowerTag === 'select') {
          elementId = 'form-select';
        } else if (lowerTag === 'textarea') {
          elementId = 'form-textarea';
        } else {
          elementId = `form-input-${generatedCounter++}`;
        }

        if (existingIds.has(elementId)) {
          elementId = `${elementId}-${generatedCounter++}`;
        }
        existingIds.add(elementId);
      }

      // Determine label text
      const placeholderMatch = attrs.match(/\bplaceholder=["']([^"']+)["']/i);
      const labelText = placeholderMatch ? placeholderMatch[1].trim() : 'ป้ายชื่อข้อมูล';

      const labelAttr = isJsx ? `htmlFor="${elementId}"` : `for="${elementId}"`;
      const labelLine = `${indent}<label ${labelAttr}>${labelText}</label>`;

      let patchedTag = line;
      if (!existingIdMatch) {
        patchedTag = line.replace(
          new RegExp(`^(\\s*)<${tag}\\b`, 'i'),
          `$1<${tag} id="${elementId}"`
        );
      }

      existingLabels.add(elementId);
      resultLines.push(labelLine);
      resultLines.push(patchedTag);
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
}

/**
 * Remediates empty <button> elements by inserting accessible button text.
 */
function remediateEmptyButtons(code: string): string {
  // Handle <button ...></button> with whitespace
  let remediated = code.replace(/<button\b([^>]*)>\s*<\/button>/gi, (match, attrs: string) => {
    if (/\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs)) {
      return match;
    }
    return `<button${attrs}>ข้อความปุ่ม</button>`;
  });

  // Handle self-closing <button ... />
  remediated = remediated.replace(/<button\b([^>]*)\/>/gi, (match, attrs: string) => {
    if (/\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs)) {
      return match;
    }
    return `<button${attrs}>ข้อความปุ่ม</button>`;
  });

  return remediated;
}

/**
 * Remediates <a> links by adding missing href and replacing vague link text.
 */
function remediateLinks(code: string): string {
  return code.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attrs: string, content: string) => {
    let patchedAttrs = attrs;
    let patchedContent = content;

    // Check href
    const hrefMatch = attrs.match(/\bhref=(["'])(.*?)\1/i);
    if (!hrefMatch) {
      patchedAttrs = ` href="#section"${attrs}`;
    } else {
      const hrefVal = hrefMatch[2].trim();
      if (hrefVal === '' || hrefVal === '#') {
        patchedAttrs = attrs.replace(/\bhref=(["'])#?\1/i, 'href="/destination"');
      }
    }

    // Check vague link text
    const cleanContent = content.trim().toLowerCase();
    const normalized = cleanContent.replace(/[.\-_>›»…]+/g, '').trim();

    if (VAGUE_LINK_TEXTS.has(cleanContent) || VAGUE_LINK_TEXTS.has(normalized)) {
      patchedContent = 'อ่านรายละเอียดเพิ่มเติม';
    }

    return `<a${patchedAttrs}>${patchedContent}</a>`;
  });
}

/**
 * Remediates <svg> graphics by adding aria-label if unlabeled and non-decorative.
 */
function remediateSvg(code: string): string {
  return code.replace(/<svg\b([^>]*)>/gi, (match, attrs: string) => {
    const isDecorative =
      /\brole=["'](?:presentation|none)["']/i.test(attrs) ||
      /\baria-hidden=["']?\{?true\}?["']?/i.test(attrs);

    if (isDecorative) {
      return match;
    }

    const hasAria =
      /\baria-label\s*=/i.test(attrs) ||
      /\baria-labelledby\s*=/i.test(attrs);

    if (!hasAria) {
      return `<svg aria-label="ไอคอน"${attrs}>`;
    }

    return match;
  });
}

/**
 * Remediates <video> and <audio> elements by adding controls and captions track.
 */
function remediateMedia(code: string, isJsx: boolean): string {
  const trackSnippet = isJsx
    ? '<track kind="captions" src="/captions.vtt" srcLang="th" label="ภาษาไทย" default />'
    : '<track kind="captions" src="/captions.vtt" srclang="th" label="ภาษาไทย" default>';

  return code.replace(/<(video|audio)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag: string, attrs: string, inner: string) => {
    let patchedAttrs = attrs;
    if (!/\bcontrols\b/i.test(attrs)) {
      patchedAttrs = ` controls${attrs}`;
    }

    const hasTrack = /<track\b[^>]*kind=["'](?:captions|subtitles)["']/i.test(inner);
    let patchedInner = inner;
    if (!hasTrack) {
      patchedInner = `\n  ${trackSnippet}${inner.trim() ? `\n${inner}` : ''}\n`;
    }

    return `<${tag}${patchedAttrs}>${patchedInner}</${tag}>`;
  });
}

/**
 * Deterministically remediates code by fixing all detected WCAG violations
 * while preserving user indentation, formatting, and syntax mode (HTML vs JSX).
 */
export function remediateCode(code: string): string {
  if (!code || code.trim() === '') {
    return code;
  }

  const syntaxMode = detectSyntaxMode(code);
  const isJsx = syntaxMode === 'jsx';

  let remediated = code;

  // 1. Remove positive tabIndex values
  remediated = removePositiveTabIndex(remediated);

  // 2. Convert clickable non-semantic elements (<div onClick=...>) to <button>
  remediated = remediateClickableContainers(remediated, isJsx);

  // 3. Remediate links (missing href, vague link text)
  remediated = remediateLinks(remediated);

  // 4. Remediate images (missing alt, redundant alt)
  remediated = remediateImages(remediated);

  // 5. Remediate SVGs (unlabeled icons)
  remediated = remediateSvg(remediated);

  // 6. Remediate media (video/audio controls and track)
  remediated = remediateMedia(remediated, isJsx);

  // 7. Remediate tables (header-less data tables)
  remediated = remediateTables(remediated);

  // 8. Remediate form controls (missing labels and IDs)
  remediated = remediateFormControls(remediated, isJsx);

  // 9. Remediate empty buttons
  remediated = remediateEmptyButtons(remediated);

  // 10. Remediate heading hierarchy (skipped heading levels)
  remediated = remediateHeadings(remediated);

  // 11. Remediate landmarks (convert top-level <div> to <main> if no landmark exists)
  remediated = remediateLandmarks(remediated);

  return remediated;
}
