/**
 * Segments plain text into clean word tokens and character bounds using Intl.Segmenter.
 * Falls back to basic regex word boundary matching if Intl.Segmenter is unsupported.
 * 
 * @param {string} text Text to segment
 * @param {string} locale Language locale
 * @returns {Array} List of word segments with bounds.
 */
export function segmentText(text, locale = 'en') {
  if (typeof Intl === 'undefined' || !Intl.Segmenter) {
    const words = [];
    const regex = /(\w+|[^\w\s]|\s+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push({
        text: match[0],
        start: match.index,
        end: regex.lastIndex,
        isWord: /\w+/.test(match[0])
      });
    }
    return words;
  }

  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    const segments = Array.from(segmenter.segment(text));
    return segments.map(seg => ({
      text: seg.segment,
      start: seg.index,
      end: seg.index + seg.segment.length,
      isWord: seg.isWordLike
    }));
  } catch (e) {
    // Default fallback
    const words = [];
    const regex = /(\w+|[^\w\s]|\s+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push({
        text: match[0],
        start: match.index,
        end: regex.lastIndex,
        isWord: /\w+/.test(match[0])
      });
    }
    return words;
  }
}
