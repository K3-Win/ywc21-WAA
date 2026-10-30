import { SyntaxMode } from '../types/accessibility';

export interface ParsedMarkupContext {
  doc: Document;
  root: HTMLElement;
  syntaxMode: SyntaxMode;
  lines: string[];
  getElementLine: (el: Element) => number;
  getOriginalOuterSnippet: (el: Element) => string;
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Detects whether markup is written in JSX/React syntax or standard HTML.
 */
export function detectSyntaxMode(code: string): SyntaxMode {
  const jsxPatterns = [
    /\bclassName\s*=/,
    /\bhtmlFor\s*=/,
    /\bon[A-Z][a-zA-Z]*\s*=/,
    /\btabIndex\s*=/,
    /<>/,
    /<\/>/,
    /\w+\s*=\s*\{/,
    /<[A-Z][A-Za-z0-9]*\b/,
  ];
  return jsxPatterns.some((pattern) => pattern.test(code)) ? 'jsx' : 'html';
}

/**
 * Normalizes JSX attribute expressions within an opening tag attribute string.
 * Converts attr={""} / attr={''} to attr="" and attr={expr} to attr="{expr}".
 */
function normalizeAttributes(attrStr: string): string {
  let result = '';
  let i = 0;
  const n = attrStr.length;

  while (i < n) {
    // Check for attr={...}
    const match = attrStr.slice(i).match(/^([a-zA-Z0-9_\-:]+)\s*=\s*\{/);
    if (match) {
      const attrName = match[1];
      const braceStart = i + match[0].length - 1; // position of {

      let depth = 1;
      let j = braceStart + 1;
      let inString: string | null = null;
      let escape = false;

      while (j < n && depth > 0) {
        const char = attrStr[j];
        if (inString) {
          if (escape) {
            escape = false;
          } else if (char === '\\') {
            escape = true;
          } else if (char === inString) {
            inString = null;
          }
        } else {
          if (char === '"' || char === "'" || char === '`') {
            inString = char;
          } else if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
          }
        }
        j++;
      }

      const expr = attrStr.slice(braceStart + 1, j - 1);
      const trimmedExpr = expr.trim();

      if (trimmedExpr === '""' || trimmedExpr === "''" || trimmedExpr === '') {
        result += `${attrName}=""`;
      } else {
        const escaped = expr.replace(/"/g, '&quot;');
        result += `${attrName}="{${escaped}}"`;
      }

      i = j;
      continue;
    }

    // Skip string literals "..." or '...'
    if (attrStr[i] === '"' || attrStr[i] === "'") {
      const quote = attrStr[i];
      result += quote;
      i++;
      while (i < n && attrStr[i] !== quote) {
        if (attrStr[i] === '\\' && i + 1 < n) {
          result += attrStr[i] + attrStr[i + 1];
          i += 2;
        } else {
          result += attrStr[i];
          i++;
        }
      }
      if (i < n) {
        result += attrStr[i];
        i++;
      }
      continue;
    }

    result += attrStr[i];
    i++;
  }

  return result;
}

/**
 * Preprocesses markup to:
 * 1. Expand JSX fragments <>...</> into <div data-a11y-fragment="true">...</div>
 * 2. Convert non-void self-closing tags (<div ... />) into <div ...></div>
 * 3. Convert attribute expressions attr={expr} into attr="{expr}"
 * 4. Tag opening elements with data-a11y-line="N" and data-a11y-id="ID"
 * 5. Track original source code snippets for every element
 */
function preprocessAndTrack(code: string): {
  normalizedHtml: string;
  snippetMap: Map<string, string>;
  lines: string[];
} {
  const lines = code.split(/\r?\n/);
  const snippetMap = new Map<string, string>();
  const tagStack: Array<{ id: string; tagName: string; startIndex: number }> = [];

  let output = '';
  let currentLine = 1;
  let nextId = 0;
  let i = 0;
  const n = code.length;

  while (i < n) {
    // 1. HTML Comment: <!-- ... -->
    if (code.startsWith('<!--', i)) {
      const endIndex = code.indexOf('-->', i + 4);
      const closeEnd = endIndex !== -1 ? endIndex + 3 : n;
      const commentText = code.slice(i, closeEnd);
      for (let c = 0; c < commentText.length; c++) {
        if (commentText[c] === '\n') {
          currentLine++;
        }
      }
      output += commentText;
      i = closeEnd;
      continue;
    }

    // 2. DOCTYPE: <!DOCTYPE ...>
    if (code.slice(i, i + 9).toLowerCase() === '<!doctype') {
      const endIndex = code.indexOf('>', i + 9);
      const closeEnd = endIndex !== -1 ? endIndex + 1 : n;
      const docText = code.slice(i, closeEnd);
      for (let c = 0; c < docText.length; c++) {
        if (docText[c] === '\n') {
          currentLine++;
        }
      }
      output += docText;
      i = closeEnd;
      continue;
    }

    // 3. JSX Fragment closing: </>
    if (code.startsWith('</>', i)) {
      // Find matching fragment
      let foundIndex = -1;
      for (let s = tagStack.length - 1; s >= 0; s--) {
        if (tagStack[s].tagName === '__fragment__') {
          foundIndex = s;
          break;
        }
      }
      if (foundIndex !== -1) {
        const frag = tagStack[foundIndex];
        snippetMap.set(frag.id, code.slice(frag.startIndex, i + 3));
        tagStack.splice(foundIndex);
      }
      output += '</div>';
      i += 3;
      continue;
    }

    // 4. JSX Fragment opening: <>
    if (code.startsWith('<>', i)) {
      const tagLine = currentLine;
      const tagId = String(nextId++);
      tagStack.push({ id: tagId, tagName: '__fragment__', startIndex: i });
      output += `<div data-a11y-fragment="true" data-a11y-line="${tagLine}" data-a11y-id="${tagId}">`;
      i += 2;
      continue;
    }

    // 5. Standard closing tag: </tagName>
    const closeTagMatch = code.slice(i).match(/^<\/([a-zA-Z][a-zA-Z0-9_\-:]*)\s*>/);
    if (closeTagMatch) {
      const closingTagName = closeTagMatch[1].toLowerCase();
      const closeEnd = i + closeTagMatch[0].length;
      let foundIndex = -1;
      for (let s = tagStack.length - 1; s >= 0; s--) {
        if (tagStack[s].tagName === closingTagName) {
          foundIndex = s;
          break;
        }
      }
      if (foundIndex !== -1) {
        const openItem = tagStack[foundIndex];
        snippetMap.set(openItem.id, code.slice(openItem.startIndex, closeEnd));
        tagStack.splice(foundIndex);
      }
      for (let c = 0; c < closeTagMatch[0].length; c++) {
        if (closeTagMatch[0][c] === '\n') {
          currentLine++;
        }
      }
      output += closeTagMatch[0];
      i = closeEnd;
      continue;
    }

    // 6. Opening tag: <tagName ...> or <tagName ... />
    const openTagMatch = code.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9_\-:]*)/);
    if (openTagMatch) {
      const tagName = openTagMatch[1];
      const tagLine = currentLine;
      const tagStartIndex = i;
      const tagId = String(nextId++);

      // Scan until end of opening tag
      let j = i + openTagMatch[0].length;
      let inQuote: string | null = null;
      let inBraceDepth = 0;

      while (j < n) {
        const char = code[j];
        if (inQuote) {
          if (char === '\\' && j + 1 < n) {
            j += 2;
            continue;
          }
          if (char === inQuote) {
            inQuote = null;
          }
        } else if (inBraceDepth > 0) {
          if (char === '"' || char === "'" || char === '`') {
            inQuote = char;
          } else if (char === '{') {
            inBraceDepth++;
          } else if (char === '}') {
            inBraceDepth--;
          }
        } else {
          if (char === '"' || char === "'") {
            inQuote = char;
          } else if (char === '{') {
            inBraceDepth = 1;
          } else if (char === '>') {
            j++;
            break;
          }
        }
        j++;
      }

      const tagEndIndex = j;
      const rawTag = code.slice(tagStartIndex, tagEndIndex);
      const isSelfClosing = /\/\s*>$/.test(rawTag);
      const isVoid = VOID_ELEMENTS.has(tagName.toLowerCase());

      const attrsRaw = isSelfClosing
        ? rawTag.slice(openTagMatch[0].length, rawTag.lastIndexOf('/')).trim()
        : rawTag.slice(openTagMatch[0].length, rawTag.length - 1).trim();

      const normalizedAttrs = normalizeAttributes(attrsRaw);
      const attrsWithSpace = normalizedAttrs ? ' ' + normalizedAttrs : '';

      if (isSelfClosing) {
        snippetMap.set(tagId, code.slice(tagStartIndex, tagEndIndex));
        if (isVoid) {
          output += `<${tagName}${attrsWithSpace} data-a11y-line="${tagLine}" data-a11y-id="${tagId}" />`;
        } else {
          output += `<${tagName}${attrsWithSpace} data-a11y-line="${tagLine}" data-a11y-id="${tagId}"></${tagName}>`;
        }
      } else {
        if (isVoid) {
          snippetMap.set(tagId, code.slice(tagStartIndex, tagEndIndex));
          output += `<${tagName}${attrsWithSpace} data-a11y-line="${tagLine}" data-a11y-id="${tagId}">`;
        } else {
          tagStack.push({ id: tagId, tagName: tagName.toLowerCase(), startIndex: tagStartIndex });
          output += `<${tagName}${attrsWithSpace} data-a11y-line="${tagLine}" data-a11y-id="${tagId}">`;
        }
      }

      for (let c = 0; c < rawTag.length; c++) {
        if (rawTag[c] === '\n') {
          currentLine++;
        }
      }

      i = tagEndIndex;
      continue;
    }

    if (code[i] === '\n') {
      currentLine++;
    }
    output += code[i];
    i++;
  }

  // Handle any unclosed tags left on stack
  for (const item of tagStack) {
    if (!snippetMap.has(item.id)) {
      snippetMap.set(item.id, code.slice(item.startIndex));
    }
  }

  return {
    normalizedHtml: output,
    snippetMap,
    lines,
  };
}

function getCleanOuterHTML(el: Element): string {
  try {
    const clone = el.cloneNode(true) as Element;
    clone.removeAttribute('data-a11y-line');
    clone.removeAttribute('data-a11y-id');
    clone.removeAttribute('data-a11y-fragment');
    clone.querySelectorAll('[data-a11y-line],[data-a11y-id],[data-a11y-fragment]').forEach((c) => {
      c.removeAttribute('data-a11y-line');
      c.removeAttribute('data-a11y-id');
      c.removeAttribute('data-a11y-fragment');
    });
    return clone.outerHTML;
  } catch {
    return el.outerHTML || '';
  }
}

/**
 * Parses markup (HTML or JSX), tags elements with line numbers, expands self-closing tags,
 * and provides helpers to get element lines and original code snippets.
 */
export function parseMarkupWithLines(code: string): ParsedMarkupContext {
  const syntaxMode = detectSyntaxMode(code);
  const { normalizedHtml, snippetMap, lines } = preprocessAndTrack(code);

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedHtml, 'text/html');

  const root = (code.toLowerCase().includes('<html') ? doc.documentElement : doc.body) as HTMLElement;

  function getElementLine(el: Element): number {
    const lineAttr = el.getAttribute('data-a11y-line');
    if (lineAttr) {
      const parsed = parseInt(lineAttr, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    const parentWithLine = el.closest('[data-a11y-line]');
    if (parentWithLine) {
      const parentParsed = parseInt(parentWithLine.getAttribute('data-a11y-line') || '', 10);
      if (!isNaN(parentParsed)) {
        return parentParsed;
      }
    }
    return 1;
  }

  function getOriginalOuterSnippet(el: Element): string {
    const id = el.getAttribute('data-a11y-id');
    if (id && snippetMap.has(id)) {
      return snippetMap.get(id)!;
    }
    const line = getElementLine(el);
    if (lines[line - 1]) {
      return lines[line - 1].trim();
    }
    return getCleanOuterHTML(el);
  }

  return {
    doc,
    root,
    syntaxMode,
    lines,
    getElementLine,
    getOriginalOuterSnippet,
  };
}
