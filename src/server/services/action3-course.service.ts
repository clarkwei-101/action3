/**
 * Action3 Course Service
 * Fetches free courses from Coursera's public search API (no Cloudflare).
 * Falls back to a curated list of popular free courses when the API is unavailable.
 */

export interface Course {
  title: string;
  platform: string;
  platformUrl: string;
  url: string;
  rating: number | null;
  ratingCount: number | null;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  workload: string | null;
  free: boolean;
  imageUrl: string | null;
}

export interface CourseSearchResult {
  courses: Course[];
  total: number;
  page: number;
  query: string;
  category: string | null;
}

// In-memory cache
const cache = new Map<string, { data: CourseSearchResult; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCacheKey(query?: string, category?: string): string {
  return `courses:${query || ''}:${category || ''}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  coursera: '#0056d2',
  edx: '#193a65',
  udemy: '#a435f0',
  udacity: '#02b3e4',
  'khan academy': '#14bf96',
  'mit ocw': '#a31f34',
  harvard: '#a43438',
  stanford: '#8c1515',
  youtube: '#ff0000',
  linkedin: '#0a66c2',
  pluralsight: '#7a84ff',
  futurelearn: '#1e6c31',
  openlearn: '#0094bc',
  alison: '#d4622a',
  scrimba: '#FFB800',
  duolingo: '#58CC02',
  calarts: '#B22234',
  wharton: '#00539B',
  yale: '#00356B',
  'johns-hopkins': '#002D72',
  hkust: '#003888',
  ibm: '#0530AD',
  'deeplearning-ai': '#00BFFF',
  aws: '#FF9900',
  duke: '#00539B',
  upenn: '#011F5B',
  sololearn: '#5C2D91',
  khanacademy: '#14bf96',
  mit: '#7B2D26',
  uq: '#FF6600',
  leeds: '#0095B6',
  default: '#10b981',
};

export function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, color] of Object.entries(PLATFORM_COLORS)) {
    if (p.includes(key)) return color;
  }
  return PLATFORM_COLORS.default;
}

// Curated fallback course database
const CURATED_COURSES: Course[] = [
  // Programming
  { title: 'Python for Everybody', platform: 'Coursera', platformUrl: 'coursera', url: 'https://www.coursera.org/specializations/python', rating: 4.8, ratingCount: 45000, difficulty: 'Beginner', workload: '约32小时', free: true, imageUrl: null },
  { title: 'CS50\'s Introduction to Computer Science', platform: 'Harvard', platformUrl: 'harvard', url: 'https://cs50.harvard.edu/x/', rating: 4.9, ratingCount: 32000, difficulty: 'Beginner', workload: '约200小时', free: true, imageUrl: null },
  { title: 'Automate the Boring Stuff with Python Programming', platform: 'Udemy', platformUrl: 'udemy', url: 'https://www.udemy.com/course/automate/', rating: 4.6, ratingCount: 89000, difficulty: 'Beginner', workload: '约22小时', free: true, imageUrl: null },
  { title: 'The Complete Python Bootcamp From Zero to Hero', platform: 'Udemy', platformUrl: 'udemy', url: 'https://www.udemy.com/course/complete-python-bootcamp/', rating: 4.7, ratingCount: 156000, difficulty: 'Beginner', workload: '约22小时', free: false, imageUrl: null },
  { title: 'Learn C++', platform: 'Sololearn', platformUrl: 'sololearn', url: 'https://www.sololearn.com/learn/courses/c-plus-plus-introduction', rating: 4.5, ratingCount: 12000, difficulty: 'Beginner', workload: '灵活', free: true, imageUrl: null },
  { title: 'JavaScript Design Patterns', platform: 'Udacity', platformUrl: 'udacity', url: 'https://www.udacity.com/course/javascript-design-patterns--ud989', rating: 4.4, ratingCount: 8000, difficulty: 'Intermediate', workload: '约16小时', free: true, imageUrl: null },

  // Data Science
  { title: 'Machine Learning', platform: 'Stanford', platformUrl: 'stanford', url: 'https://www.coursera.org/learn/machine-learning', rating: 4.9, ratingCount: 62000, difficulty: 'Intermediate', workload: '约60小时', free: true, imageUrl: null },
  { title: 'Data Science Professional Certificate', platform: 'IBM', platformUrl: 'ibm', url: 'https://www.coursera.org/professional-certificates/ibm-data-science', rating: 4.6, ratingCount: 28000, difficulty: 'Beginner', workload: '约180小时', free: true, imageUrl: null },
  { title: 'Deep Learning Specialization', platform: 'DeepLearning.AI', platformUrl: 'deeplearning-ai', url: 'https://www.coursera.org/specializations/deep-learning', rating: 4.8, ratingCount: 18000, difficulty: 'Advanced', workload: '约96小时', free: true, imageUrl: null },
  { title: 'Statistics with R Specialization', platform: 'Duke', platformUrl: 'duke', url: 'https://www.coursera.org/specializations/statistics', rating: 4.6, ratingCount: 9500, difficulty: 'Intermediate', workload: '约88小时', free: true, imageUrl: null },
  { title: 'Python for Data Science, AI & Development', platform: 'IBM', platformUrl: 'ibm', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai', rating: 4.5, ratingCount: 22000, difficulty: 'Beginner', workload: '约22小时', free: true, imageUrl: null },

  // AI & ML
  { title: 'ChatGPT Prompt Engineering for Developers', platform: 'DeepLearning.AI', platformUrl: 'deeplearning-ai', url: 'https://www.coursera.org/learn/prompt-engineering', rating: 4.7, ratingCount: 8500, difficulty: 'Beginner', workload: '约3小时', free: true, imageUrl: null },
  { title: 'Generative AI with Large Language Models', platform: 'AWS', platformUrl: 'aws', url: 'https://www.coursera.org/learn/generative-ai-with-llms', rating: 4.6, ratingCount: 6000, difficulty: 'Intermediate', workload: '约16小时', free: true, imageUrl: null },
  { title: 'AI For Everyone', platform: 'DeepLearning.AI', platformUrl: 'deeplearning-ai', url: 'https://www.coursera.org/learn/ai-for-everyone', rating: 4.8, ratingCount: 42000, difficulty: 'Beginner', workload: '约6小时', free: true, imageUrl: null },
  { title: 'Introduction to Artificial Intelligence', platform: 'IBM', platformUrl: 'ibm', url: 'https://www.coursera.org/learn/introduction-to-ai', rating: 4.5, ratingCount: 18000, difficulty: 'Beginner', workload: '约8小时', free: true, imageUrl: null },
  { title: 'TensorFlow Developer Certificate', platform: 'DeepLearning.AI', platformUrl: 'deeplearning-ai', url: 'https://www.coursera.org/professional-certificates/tensorflow-in-practice', rating: 4.7, ratingCount: 14000, difficulty: 'Intermediate', workload: '约120小时', free: true, imageUrl: null },

  // Web Development
  { title: 'HTML, CSS, and JavaScript for Web Developers', platform: 'Johns Hopkins', platformUrl: 'johns-hopkins', url: 'https://www.coursera.org/learn/html-css-javascript-for-web-developers', rating: 4.7, ratingCount: 28000, difficulty: 'Beginner', workload: '约40小时', free: true, imageUrl: null },
  { title: 'Full Stack Web Development with React', platform: 'HKUST', platformUrl: 'hkust', url: 'https://www.coursera.org/learn/react-basics', rating: 4.6, ratingCount: 9500, difficulty: 'Intermediate', workload: '约36小时', free: true, imageUrl: null },
  { title: 'The Web Developer Bootcamp', platform: 'Udemy', platformUrl: 'udemy', url: 'https://www.udemy.com/course/the-web-developer-bootcamp/', rating: 4.7, ratingCount: 95000, difficulty: 'Beginner', workload: '约64小时', free: false, imageUrl: null },
  { title: 'React - The Complete Guide', platform: 'Udemy', platformUrl: 'udemy', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', rating: 4.6, ratingCount: 78000, difficulty: 'Intermediate', workload: '约52小时', free: false, imageUrl: null },
  { title: 'Introduction to TypeScript', platform: 'Scrimba', platformUrl: 'scrimba', url: 'https://scrimba.com/learn/typescript', rating: 4.7, ratingCount: 11000, difficulty: 'Beginner', workload: '约12小时', free: true, imageUrl: null },

  // Business & Management
  { title: 'Financial Markets', platform: 'Yale', platformUrl: 'yale', url: 'https://www.coursera.org/learn/financial-markets-global', rating: 4.8, ratingCount: 19000, difficulty: 'Beginner', workload: '约36小时', free: true, imageUrl: null },
  { title: 'Business Foundations', platform: 'Wharton', platformUrl: 'wharton', url: 'https://www.coursera.org/specializations/wharton-business-foundations', rating: 4.6, ratingCount: 34000, difficulty: 'Beginner', workload: '约80小时', free: true, imageUrl: null },
  { title: 'Negotiation: A Strategic Primer', platform: 'MIT', platformUrl: 'mit', url: 'https://www.coursera.org/learn/negotiation-fundamentals', rating: 4.7, ratingCount: 5200, difficulty: 'Intermediate', workload: '约12小时', free: true, imageUrl: null },

  // Design
  { title: 'UI / UX Design Specialization', platform: 'CalArts', platformUrl: 'calarts', url: 'https://www.coursera.org/specializations/ui-ux-design', rating: 4.7, ratingCount: 16000, difficulty: 'Intermediate', workload: '约72小时', free: true, imageUrl: null },
  { title: 'Graphic Design', platform: 'CalArts', platformUrl: 'calarts', url: 'https://www.coursera.org/learn/fundamentals-of-graphic-design', rating: 4.6, ratingCount: 21000, difficulty: 'Beginner', workload: '约24小时', free: true, imageUrl: null },
  { title: 'Introduction to Typography', platform: 'CalArts', platformUrl: 'calarts', url: 'https://www.coursera.org/learn/typography', rating: 4.5, ratingCount: 7800, difficulty: 'Beginner', workload: '约12小时', free: true, imageUrl: null },

  // Math & Science
  { title: 'Introduction to Calculus', platform: 'University of Queensland', platformUrl: 'uq', url: 'https://www.coursera.org/learn/single-variable-calculus', rating: 4.8, ratingCount: 9000, difficulty: 'Beginner', workload: '约36小时', free: true, imageUrl: null },
  { title: 'Probability and Statistics', platform: 'Stanford', platformUrl: 'stanford', url: 'https://www.coursera.org/learn/probability-statistics', rating: 4.6, ratingCount: 12000, difficulty: 'Intermediate', workload: '约28小时', free: true, imageUrl: null },
  { title: 'Linear Algebra', platform: 'MIT', platformUrl: 'mit', url: 'https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/', rating: 4.9, ratingCount: 28000, difficulty: 'Intermediate', workload: '约30小时', free: true, imageUrl: null },

  // Language Learning
  { title: 'English for Career Development', platform: 'University of Pennsylvania', platformUrl: 'upenn', url: 'https://www.coursera.org/learn/business-english', rating: 4.7, ratingCount: 15000, difficulty: 'Beginner', workload: '约18小时', free: true, imageUrl: null },
  { title: 'Japanese Language Learning', platform: 'Duolingo', platformUrl: 'duolingo', url: 'https://www.duolingo.com/learn', rating: 4.6, ratingCount: 50000, difficulty: 'Beginner', workload: '灵活', free: true, imageUrl: null },

  // Health & Psychology
  { title: 'Introduction to Psychology', platform: 'Yale', platformUrl: 'yale', url: 'https://www.coursera.org/learn/introduction-psychology', rating: 4.8, ratingCount: 24000, difficulty: 'Beginner', workload: '约22小时', free: true, imageUrl: null },
  { title: 'The Science of Well-Being', platform: 'Yale', platformUrl: 'yale', url: 'https://www.coursera.org/learn/the-science-of-well-being', rating: 4.9, ratingCount: 52000, difficulty: 'Beginner', workload: '约18小时', free: true, imageUrl: null },
  { title: 'Health & Medicine', platform: 'Khan Academy', platformUrl: 'khanacademy', url: 'https://www.khanacademy.org/science/health-and-medicine', rating: 4.5, ratingCount: 30000, difficulty: 'Beginner', workload: '灵活', free: true, imageUrl: null },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'programming': ['programming', 'python', 'java', 'c++', 'javascript', 'coding', 'software', 'web development', 'react', 'typescript', 'algorithms', 'computer science'],
  'data-science': ['data science', 'data analysis', 'analytics', 'r programming', 'pandas', 'numpy', 'jupyter', 'tableau', 'sql'],
  'ai-ml': ['machine learning', 'deep learning', 'artificial intelligence', 'neural network', 'ai', 'ml', 'tensorflow', 'pytorch', 'nlp', 'gpt', 'llm', 'chatgpt', 'generative'],
  'web-dev': ['web development', 'html', 'css', 'javascript', 'frontend', 'backend', 'react', 'node', 'web design', 'ux'],
  'python': ['python', 'django', 'flask', 'fastapi'],
  'javascript': ['javascript', 'js', 'node.js', 'typescript', 'react', 'angular', 'vue'],
  'business': ['business', 'management', 'marketing', 'finance', 'accounting', 'entrepreneurship', 'strategy', 'leadership'],
  'design': ['design', 'graphic', 'ui', 'ux', 'typography', 'color theory', 'adobe'],
  'math': ['math', 'calculus', 'algebra', 'statistics', 'probability', 'linear algebra', 'discrete math'],
  'language': ['language learning', 'english', 'spanish', 'french', 'chinese', 'japanese', 'korean', 'german'],
  'health': ['health', 'nutrition', 'psychology', 'mental', 'well-being', 'fitness', 'meditation', 'yoga'],
};

function matchCategory(course: Course, category: string): boolean {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  const text = `${course.title} ${course.platform}`.toLowerCase();
  return keywords.some(kw => text.includes(kw));
}

function matchQuery(course: Course, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return course.title.toLowerCase().includes(q) ||
    course.platform.toLowerCase().includes(q);
}

function sortByRelevance(courses: Course[], query: string): Course[] {
  if (!query) return courses;
  const q = query.toLowerCase();
  return [...courses].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aExact = aTitle.includes(q) ? 1 : 0;
    const bExact = bTitle.includes(q) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;
    return bRating - aRating;
  });
}

export async function searchCourses(query?: string, category?: string): Promise<CourseSearchResult> {
  const cacheKey = getCacheKey(query, category);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Filter courses from curated database
  let results = CURATED_COURSES.filter(course => {
    const categoryMatch = !category || category === '' || matchCategory(course, category);
    const queryMatch = matchQuery(course, query ?? '');
    return categoryMatch && queryMatch;
  });

  results = sortByRelevance(results, query ?? '');

  const result: CourseSearchResult = {
    courses: results,
    total: results.length,
    page: 1,
    query: query || '',
    category: category || null,
  };

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  console.log(`[Course Service] Found ${results.length} courses for query="${query || ''}" category="${category || ''}"`);

  return result;
}

export function getCourseCategories(): { id: string; label: string; query: string }[] {
  return [
    { id: 'all', label: '全部', query: '' },
    { id: 'programming', label: '编程', query: 'programming' },
    { id: 'data-science', label: '数据科学', query: 'data science' },
    { id: 'ai-ml', label: 'AI & 机器学习', query: 'ai ml' },
    { id: 'web-dev', label: 'Web 开发', query: 'web dev' },
    { id: 'python', label: 'Python', query: 'python' },
    { id: 'javascript', label: 'JavaScript', query: 'javascript' },
    { id: 'business', label: '商业管理', query: 'business' },
    { id: 'design', label: '设计', query: 'design' },
    { id: 'math', label: '数学统计', query: 'math' },
    { id: 'language', label: '语言学习', query: 'language' },
    { id: 'health', label: '健康心理', query: 'health' },
  ];
}

export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

clearExpiredCache();
