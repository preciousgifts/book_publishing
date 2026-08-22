/**
 * Page Catalog configuration for KDP Front Matter & Back Matter Pages
 */

const FRONT_MATTER_CATALOG = [
  {
    pageType: 'title_page',
    title: 'Title Page',
    section: 'FRONT',
    defaultOrder: 1,
    description: 'Displays working title, subtitle, and author/pen name.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook', 'cookbook', 'children', 'journal', 'low-content']
  },
  {
    pageType: 'copyright_page',
    title: 'Copyright Page',
    section: 'FRONT',
    defaultOrder: 2,
    description: 'Contains copyright year, rights statement, ISBN, and AI disclosure clause.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook', 'cookbook', 'children', 'journal', 'low-content']
  },
  {
    pageType: 'dedication',
    title: 'Dedication',
    section: 'FRONT',
    defaultOrder: 3,
    description: 'Personal dedication to individuals, supporters, or readers.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'children']
  },
  {
    pageType: 'epigraph',
    title: 'Epigraph',
    section: 'FRONT',
    defaultOrder: 4,
    description: 'A relevant quotation or literary teaser at the start of the book.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir']
  },
  {
    pageType: 'table_of_contents',
    title: 'Table of Contents',
    section: 'FRONT',
    defaultOrder: 5,
    description: 'Dynamically generated overview of chapters and included matter pages.',
    requiresInput: false,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook', 'cookbook', 'journal', 'low-content']
  },
  {
    pageType: 'foreword',
    title: 'Foreword',
    section: 'FRONT',
    defaultOrder: 6,
    description: 'An introductory note written on behalf of a guest contributor or expert.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'memoir', 'guide']
  },
  {
    pageType: 'preface',
    title: 'Preface',
    section: 'FRONT',
    defaultOrder: 7,
    description: 'Author note explaining the background and motivation behind the book.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide', 'memoir']
  },
  {
    pageType: 'acknowledgments',
    title: 'Acknowledgments',
    section: 'FRONT',
    defaultOrder: 8,
    description: 'Expresses gratitude to contributors, editors, family, and supporters.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir']
  },
  {
    pageType: 'introduction',
    title: 'Introduction',
    section: 'FRONT',
    defaultOrder: 9,
    description: 'Sets the stage for the core manuscript topics and themes.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide', 'workbook']
  }
];

const BACK_MATTER_CATALOG = [
  {
    pageType: 'appendix',
    title: 'Appendix',
    section: 'BACK',
    defaultOrder: 10,
    description: 'Supplementary materials, reference tables, data, or bonus guides.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide', 'workbook']
  },
  {
    pageType: 'glossary',
    title: 'Glossary',
    section: 'BACK',
    defaultOrder: 11,
    description: 'Alphabetized definitions of key terms used throughout the manuscript.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide', 'workbook']
  },
  {
    pageType: 'bibliography',
    title: 'Endnotes / Bibliography',
    section: 'BACK',
    defaultOrder: 12,
    description: 'Citations, source references, and recommended reading.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide']
  },
  {
    pageType: 'index',
    title: 'Index',
    section: 'BACK',
    defaultOrder: 13,
    description: 'Key subject terms and concept references.',
    requiresInput: true,
    recommendedFor: ['non-fiction', 'educational', 'guide']
  },
  {
    pageType: 'about_author',
    title: 'About the Author',
    section: 'BACK',
    defaultOrder: 14,
    description: 'Author bio, credentials, website, and background story.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook', 'cookbook', 'children', 'journal', 'low-content']
  },
  {
    pageType: 'also_by_author',
    title: 'Also By the Author',
    section: 'BACK',
    defaultOrder: 15,
    description: 'List of other books, series, or publications by the author.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'children']
  },
  {
    pageType: 'discussion_questions',
    title: 'Book Club / Discussion Questions',
    section: 'BACK',
    defaultOrder: 16,
    description: 'Engaging discussion prompts for book clubs and group study.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook']
  },
  {
    pageType: 'call_to_action',
    title: 'Call-to-Action / Review Request',
    section: 'BACK',
    defaultOrder: 17,
    description: 'Closing request encouraging readers to leave an Amazon review or visit website.',
    requiresInput: true,
    recommendedFor: ['fiction', 'non-fiction', 'memoir', 'educational', 'guide', 'workbook', 'cookbook']
  }
];

const FULL_MATTER_CATALOG = [...FRONT_MATTER_CATALOG, ...BACK_MATTER_CATALOG];

/**
 * Returns a set of pageTypes that default to included=true for a given bookType / genre.
 */
function getRecommendedDefaults(bookType = 'non-fiction') {
  const normType = String(bookType).toLowerCase();

  return FULL_MATTER_CATALOG.filter((item) => {
    // Universally required
    if (['title_page', 'copyright_page', 'table_of_contents'].includes(item.pageType)) {
      return true;
    }

    // Cookbook / Journal / Low-content rules
    if (['cookbook', 'journal', 'low-content'].includes(normType)) {
      if (['foreword', 'preface', 'bibliography', 'index'].includes(item.pageType)) {
        return false;
      }
      return ['title_page', 'copyright_page', 'table_of_contents', 'about_author'].includes(item.pageType);
    }

    // Memoir rules
    if (normType === 'memoir') {
      if (['glossary', 'index'].includes(item.pageType)) {
        return false;
      }
      return ['dedication', 'epigraph', 'foreword', 'acknowledgments', 'about_author', 'title_page', 'copyright_page', 'table_of_contents'].includes(item.pageType);
    }

    // Educational / Guide / Workbook rules
    if (['educational', 'guide', 'workbook'].includes(normType)) {
      if (['epigraph', 'foreword'].includes(item.pageType)) {
        return false;
      }
      return ['introduction', 'glossary', 'appendix', 'discussion_questions', 'bibliography', 'title_page', 'copyright_page', 'table_of_contents', 'about_author'].includes(item.pageType);
    }

    // Children's book rules
    if (normType === 'children') {
      if (['bibliography', 'index', 'appendix'].includes(item.pageType)) {
        return false;
      }
      return ['title_page', 'copyright_page', 'dedication', 'about_author', 'table_of_contents'].includes(item.pageType);
    }

    // General Fiction / Non-Fiction fallback using recommendedFor list
    return item.recommendedFor.includes(normType);
  }).map((item) => item.pageType);
}

module.exports = {
  FRONT_MATTER_CATALOG,
  BACK_MATTER_CATALOG,
  FULL_MATTER_CATALOG,
  getRecommendedDefaults
};
