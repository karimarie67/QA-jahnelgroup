/**
 * Site config for the Jahnel Group website Engagement.
 * https://www.jahnelgroup.com is the live site, with no staging copy, so every
 * test is read-only: nothing here may be used to type into or submit a form.
 * Every expected value below comes from a probe of the live site (2026-09-25).
 */

/**
 * Get the base URL from the current project configuration
 * @param {import('@playwright/test').TestInfo} testInfo - Test info object
 * @returns {string} The base URL for the current project
 */
export function getBaseURL(testInfo) {
  const config = testInfo.project.use;
  return config.baseURL || 'https://www.jahnelgroup.com';
}

/**
 * Build a URL relative to the current project's base URL
 * @param {import('@playwright/test').TestInfo} testInfo - Test info object
 * @param {string} path - The path to append to base URL
 * @param {Object} options - URL options
 * @param {boolean} options.cachebust - Add cachebust parameter
 * @param {Object} options.params - Additional query parameters
 * @returns {string} Complete URL
 */
export function buildURL(testInfo, path = '/', options = {}) {
  const baseURL = getBaseURL(testInfo);
  const url = new URL(path, baseURL);

  if (options.cachebust) {
    url.searchParams.set('cachebust', Date.now().toString());
  }

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Every page on the site, by path. These are the 27 pages a crawl from the
 * home page reaches; the site has no sitemap.
 */
export const urlPatterns = {
  homepage: '/',
  // Services
  aiTransformation: '/ai-transformation',
  aiAcceleratedAppDev: '/ai-accelerated-app-dev',
  aiLegacyModernization: '/ai-legacy-modernization',
  aiNativeStaffAug: '/ai-native-staff-aug',
  recruiting: '/recruiting',
  subscriptionAi: '/subscription-ai',
  // Case studies
  caseStudies: '/case-studies',
  aiAssistedOnboarding: '/ai-assisted-onboarding',
  aiAssistedQualityDocumentation: '/ai-assisted-quality-documentation',
  agenticSdlc: '/agentic-sdlc',
  // Company
  team: '/team',
  culture: '/culture',
  photos: '/photos',
  videos: '/videos',
  office: '/office',
  capitalRegion: '/capital-region',
  warWeek: '/war-week',
  mugshots: '/mugshots',
  communityPartnerships: '/community-partnerships',
  jgAtlas: '/jg-atlas',
  // Careers and contact
  careers: '/careers',
  positions: '/positions',
  contact: '/contact',
  // Trust pages
  privacyNotice: '/privacy-notice',
  securityCompliance: '/security-compliance',
  aiSecurity: '/ai-security',
};

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Expected URL patterns for navigation validation
 */
export const expectedUrlPatterns = {
  homepage: /jahnelgroup\.com\/?(\?.*)?$/,
  // A page's own path, with at most a trailing slash or a query string after it.
  page: path => new RegExp(`jahnelgroup\\.com${escapeRegExp(path)}\\/?(\\?.*)?$`),
  mailto: /^mailto:[^@\s]+@jahnelgroup\.com$/,
  tel: /^tel:\+1\d{10}$/,
};

/**
 * Test data constants
 */
export const testData = {
  siteName: 'Jahnel Group',
  // What each page's <title> reads. Most are "<page> — Jahnel Group".
  pageTitles: {
    homepage: 'Jahnel Group — Where AI Becomes Reality',
    aiTransformation: 'AI Transformation — Jahnel Group',
    aiAcceleratedAppDev: 'AI Accelerated App Development — Jahnel Group',
    aiLegacyModernization: 'AI Legacy Modernization — Jahnel Group',
    aiNativeStaffAug: 'AI-Native Staff Aug — Jahnel Group',
    recruiting: 'Recruiting — Jahnel Group',
    subscriptionAi: 'Subscription AI — Jahnel Group',
    caseStudies: 'Case Studies — Jahnel Group',
    aiAssistedOnboarding: 'AI-Assisted Onboarding — Jahnel Group',
    aiAssistedQualityDocumentation: 'AI-Assisted Quality Documentation — Jahnel Group',
    agenticSdlc: 'Agentic SDLC — Jahnel Group',
    team: 'Team — Jahnel Group',
    culture: 'Culture — Jahnel Group',
    photos: 'Photos — Jahnel Group',
    videos: 'Videos — Jahnel Group',
    office: 'Our HQ — Jahnel Group',
    capitalRegion: 'Life in the Capital Region — Jahnel Group',
    warWeek: 'War Week — Jahnel Group',
    mugshots: 'The Mugshot Challenge — Jahnel Group',
    communityPartnerships: 'Community Partnerships — Jahnel Group',
    jgAtlas: 'JG Atlas — Idea to Deployed Software · Jahnel Group',
    careers: 'Careers — Jahnel Group',
    positions: 'Open Positions — Jahnel Group',
    contact: 'Contact — Jahnel Group',
    privacyNotice: 'Privacy Notice — Jahnel Group',
    securityCompliance: 'Security & Compliance — Jahnel Group',
    aiSecurity: 'AI Security — Jahnel Group',
  },
  notFoundTitle: 'Page Not Found — Jahnel Group',
  // Header menu links after the Services menu, in order, with the page each reaches.
  navLinks: [
    ['Case Studies', 'caseStudies'],
    ['Team', 'team'],
    ['Culture', 'culture'],
    ['Careers', 'careers'],
    ['Contact', 'contact'],
  ],
  // The Services menu's links (their names start with these), and their pages.
  serviceLinks: [
    ['AI Transformation', 'aiTransformation'],
    ['AI Accelerated App Development', 'aiAcceleratedAppDev'],
    ['AI Legacy Modernization', 'aiLegacyModernization'],
    ['AI Native Staff Augmentation/Pods', 'aiNativeStaffAug'],
    ['Recruiting & Direct Placements', 'recruiting'],
    ['Subscription AI', 'subscriptionAi'],
  ],
  // Footer links to the site's own pages, by name, and their pages.
  footerLinks: [
    ['Team', 'team'],
    ['Culture', 'culture'],
    ['Case Studies', 'caseStudies'],
    ['Careers', 'careers'],
    ['Photos', 'photos'],
    ['Videos', 'videos'],
    ['Contact', 'contact'],
    ['AI Transformation', 'aiTransformation'],
    ['AI Accelerated App Dev', 'aiAcceleratedAppDev'],
    ['AI Legacy Modernization', 'aiLegacyModernization'],
    ['AI Native Staff Aug/Pods', 'aiNativeStaffAug'],
    ['Recruiting & Direct Placements', 'recruiting'],
    ['Subscription AI', 'subscriptionAi'],
    ['Privacy Notice', 'privacyNotice'],
    ['Security & Compliance', 'securityCompliance'],
    ['AI Security', 'aiSecurity'],
  ],
  // Footer social links, by name, and where each points.
  socialLinks: [
    ['LinkedIn', 'https://www.linkedin.com/company/jahnelgroup'],
    ['Facebook', 'https://www.facebook.com/jahnelgroup/'],
    ['Instagram', 'https://www.instagram.com/jahnelgroup/'],
    ['YouTube', 'https://www.youtube.com/c/JahnelGroupSchenectady'],
    ['X', 'https://x.com/JahnelGroup'],
  ],
  contact: {
    address: '108 State St, 5th Floor',
    phone: '(518) 356-0039',
    email: 'general@jahnelgroup.com',
  },
  // Contact form fields, by label as the site shows them. The tests only
  // check that these exist; they never type into them or send the form.
  contactFormFields: ['Company', 'First Name', 'Last Name', 'Work Phone', 'Email*', 'Tell Us About Your Project*'],
  // The contact form fields marked required, by label.
  contactRequiredFields: ['Email*', 'Tell Us About Your Project*'],
  // The Open Positions filters, by the start of their names. Each name ends
  // with its role count, which changes as roles open and close.
  roleFilters: ['All Roles', 'JG Internal', 'Latin America', 'External'],
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    download: 60000,
  },
  viewport: {
    desktop: { width: 1280, height: 720 },
    // Pixel 5, which the *-mobile projects emulate.
    mobile: { width: 393, height: 851 },
  }
};
