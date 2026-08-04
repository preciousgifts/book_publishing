/**
 * Parses an HTML string and splits it into individual word/whitespace tokens
 * while retaining styling (bold, italic) and calculating absolute start/end offsets.
 * 
 * Uses the browser's native Intl.Segmenter for high-fidelity multi-language
 * word boundary tracking, falling back to a regex parser if Segmenter is unavailable.
 * 
 * @param {string} htmlString - The HTML content to parse.
 * @returns {Array} List of word objects.
 */
export function parseHtmlToWords(htmlString) {
  if (typeof window === 'undefined' || !window.DOMParser) {
    return [{
      text: htmlString.replace(/<[^>]*>/g, ''),
      start: 0,
      end: htmlString.length,
      isWord: true,
      bold: false,
      italic: false
    }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tokens = [];

  function traverse(node, currentStyles = { bold: false, italic: false }) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        tokens.push({
          text: node.textContent,
          ...currentStyles
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const newStyles = { ...currentStyles };
      if (tag === 'strong' || tag === 'b') {
        newStyles.bold = true;
      } else if (tag === 'em' || tag === 'i') {
        newStyles.italic = true;
      }
      for (const child of node.childNodes) {
        traverse(child, newStyles);
      }
    }
  }

  for (const child of doc.body.childNodes) {
    traverse(child);
  }

  const words = [];
  let charOffset = 0;

  const hasSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter;
  const segmenter = hasSegmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

  tokens.forEach(token => {
    if (segmenter) {
      const segments = Array.from(segmenter.segment(token.text));
      segments.forEach(seg => {
        const start = charOffset + seg.index;
        const end = start + seg.segment.length;
        words.push({
          text: seg.segment,
          start,
          end,
          isWord: seg.isWordLike,
          bold: token.bold,
          italic: token.italic
        });
      });
      charOffset += token.text.length;
    } else {
      const segments = token.text.split(/([^\w\s\u00C0-\u017F]+|\s+)/);
      segments.forEach(seg => {
        if (!seg) return;
        const start = charOffset;
        const end = charOffset + seg.length;
        charOffset = end;

        const isWord = /\S/.test(seg) && !/^[^\w\s\u00C0-\u017F]+$/.test(seg);

        words.push({
          text: seg,
          start,
          end,
          isWord,
          bold: token.bold,
          italic: token.italic
        });
      });
    }
  });

  return words;
}
