/**
 * Internal helper: turn a single fallback definition into a Playwright locator.
 * A definition is either:
 *   - a plain CSS selector string -> page.locator(string)
 *   - a descriptor object with one of:
 *       { role, roleOptions? }        -> page.getByRole(role, roleOptions)
 *       { selector }                  -> page.locator(selector)
 *     plus optional modifiers:
 *       { childSelector }             -> .locator(childSelector)
 *       { hasText }                   -> .filter({ hasText })
 *       { hasNotIframe: true }        -> .filter({ hasNot: page.locator('iframe') })
 *       { first: true }               -> .first()
 */
function toLocator(page, def) {
  if (typeof def === 'string') {
    return page.locator(def);
  }

  let loc = def.role
    ? page.getByRole(def.role, def.roleOptions)
    : page.locator(def.selector);

  if (def.childSelector) {
    loc = loc.locator(def.childSelector);
  }
  if (def.hasText) {
    loc = loc.filter({ hasText: def.hasText });
  }
  if (def.hasNotIframe) {
    loc = loc.filter({ hasNot: page.locator('iframe') });
  }
  if (def.first) {
    loc = loc.first();
  }

  return loc;
}

/**
 * Internal helper: build a `.or(...)`-chained locator from an ordered array
 * of fallback definitions (see toLocator above).
 */
function buildChain(page, defs) {
  if (!defs || defs.length === 0) {
    throw new Error('buildChain: fallback array is empty - add at least one selector definition.');
  }
  return defs.map(def => toLocator(page, def)).reduce((acc, loc) => acc.or(loc));
}

// Mobile navigation selectors with comprehensive fallbacks
export const mobileToggleFallbacks = [
  'button[class*="menu"], button[aria-label*="menu" i], .mobile-toggle, #mobile-toggle, [class*="hamburger"]',
  'button[aria-expanded], button[data-toggle="menu"]',
  '.nav-toggle, .navbar-toggle, .menu-toggle',
];

export const mobileMenuFallbacks = [
  '[class*="mobile-menu"], [class*="nav-menu"][class*="open"], nav ul[class*="show"], .mobile-nav',
  '[aria-expanded="true"] + ul, [aria-expanded="true"] + div',
  '.navbar-collapse.show, .nav-menu.active',
];

// Logo selector with multiple fallback strategies
export const logoFallbacks = [
  { selector: '.logo img, #logo img, [class*="logo"] img', hasNotIframe: true },
  { selector: 'header img, nav img', first: true },
  { selector: 'a[href="/"] img, a[href="./"] img', first: true },
];

// Navigation selectors
export const navFallbacks = [
  { role: 'navigation', first: true },
  'header nav, .navbar, .navigation',
  { selector: 'nav, div[class*="nav"], section[class*="nav"]', first: true },
];

export const navLinksFallbacks = [
  { role: 'navigation', childSelector: 'a' },
  'nav a, header a, [class*="nav"] a',
  '.navbar a, .navigation a',
];

// Content area selectors
export const contentFallbacks = [
  { role: 'main' },
  'main, [role="main"], .content, #content',
  '.main-content, .page-content, #main',
  { role: 'heading', roleOptions: { level: 1 } },
  { selector: 'h1, h2, h3', first: true },
  { selector: 'article, section', first: true },
];

// CTA (Call to Action) button selectors with comprehensive patterns
export const ctaFallbacks = [
  { role: 'link', roleOptions: { name: /download|release|get started|latest|learn more/i } },
  { role: 'button', roleOptions: { name: /download|release|get started|latest|learn more/i } },
  'a[href*="download"], a[href*="release"], a[href*="get-started"]',
  { selector: 'a', hasText: /download.*latest.*release|get.*started|learn.*more/i },
  '.cta, #cta, [class*="cta"], [class*="download"], [class*="release"]',
  { selector: 'a[class*="btn"], button[class*="btn"]', hasText: /download|release|get started|latest/i },
  '[role="button"]:has-text("Download"), [role="button"]:has-text("Get Started")',
];

// External links selector
export const externalLinksFallbacks = [
  { selector: 'a[href^="http"]', hasText: /.+/ },
  { selector: 'a[href^="https"]', hasText: /.+/ },
  { selector: 'a[target="_blank"]', hasText: /.+/ },
];

// Footer selector
export const footerFallbacks = [
  { role: 'contentinfo', first: true },
  'footer, .footer, #footer',
  '[role="contentinfo"]',
];

// Form elements
export const formsInputFallbacks = ['input:not([type="hidden"])'];
export const formsButtonFallbacks = ['button, input[type="submit"], input[type="button"]'];
export const formsSelectFallbacks = ['select'];
export const formsTextareaFallbacks = ['textarea'];

// Common UI elements
export const modalsFallbacks = [
  '[role="dialog"], .modal, .popup',
  '[aria-modal="true"]',
  '.overlay, .lightbox',
];

export const alertsFallbacks = [
  '[role="alert"], .alert, .notification',
  '.error, .warning, .success, .info',
  '[class*="toast"], [class*="snackbar"]',
];

// Loading indicators
export const loadingFallbacks = [
  '.loading, .spinner, [class*="load"]',
  '[aria-busy="true"]',
  '.progress, [role="progressbar"]',
];

export const selectors = {
  // Mobile navigation selectors with comprehensive fallbacks
  mobileToggle: page => buildChain(page, mobileToggleFallbacks),

  mobileMenu: page => buildChain(page, mobileMenuFallbacks),

  // Logo selector with multiple fallback strategies
  logo: page => buildChain(page, logoFallbacks),

  // Navigation selectors
  nav: page => buildChain(page, navFallbacks),

  navLinks: page => buildChain(page, navLinksFallbacks),

  // Content area selectors
  content: page => buildChain(page, contentFallbacks),

  // CTA (Call to Action) button selectors with comprehensive patterns
  cta: page => buildChain(page, ctaFallbacks),

  // External links selector
  externalLinks: page => buildChain(page, externalLinksFallbacks),

  // Footer selector
  footer: page => buildChain(page, footerFallbacks),

  // Form elements
  forms: {
    input: page => buildChain(page, formsInputFallbacks),
    button: page => buildChain(page, formsButtonFallbacks),
    select: page => buildChain(page, formsSelectFallbacks),
    textarea: page => buildChain(page, formsTextareaFallbacks),
  },

  // Common UI elements
  modals: page => buildChain(page, modalsFallbacks),

  alerts: page => buildChain(page, alertsFallbacks),

  // Loading indicators
  loading: page => buildChain(page, loadingFallbacks),

  // The skeleton specs' hooks, by role and accessible name, which survive a
  // site's redesigns better than classes and IDs. The phone menu keeps using
  // mobileToggle / mobileMenu above (test-helpers.js handleMobileMenu).
  site: {
    nav: page => page.getByRole('navigation').first(),
    navLink: (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true }).first(),
    mainHeading: page => page.getByRole('heading', { level: 1 }),
    footer: page => page.getByRole('contentinfo'),
    footerLink: (page, name) => page.getByRole('contentinfo').getByRole('link', { name, exact: true }),
  },

  // Jahnel Group website elements, by role and accessible name. The site has
  // no <header> or <main> element, so these hang off the navigation and
  // contentinfo landmarks, and the page's headings.
  jg: {
    nav: page => page.getByRole('navigation'),
    logo: page => page.getByRole('navigation').getByRole('link', { name: 'Jahnel Group — Home' }),
    // Phones get this button; it slides the header menu in from the right.
    menuButton: page => page.getByRole('button', { name: 'Toggle menu' }),
    navLink: (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true }),
    servicesButton: page => page.getByRole('navigation').getByRole('button', { name: 'Services' }),
    servicesMenu: page => page.getByRole('navigation').getByRole('menu'),
    // Each Services link's name is the service plus a one-line summary.
    serviceLink: (page, name) => page.getByRole('navigation').getByRole('menu').getByRole('link', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }),
    mainHeading: page => page.getByRole('heading', { level: 1 }),
    footer: page => page.getByRole('contentinfo'),
    footerLink: (page, name) => page.getByRole('contentinfo').getByRole('link', { name, exact: true }),
    copyright: page => page.getByRole('contentinfo').getByText(/Copyright ©/),
    contactForm: page => page.locator('#conForm'),
    contactField: (page, label) => page.locator('#conForm').getByLabel(label, { exact: true }),
    recaptcha: page => page.locator('#conForm iframe[src*="recaptcha"]'),
    // Located only to check it's there. Never click it: that sends a real message.
    contactSubmit: page => page.getByRole('button', { name: 'Send Message' }),
    roleFilters: page => page.getByRole('group', { name: 'Filter roles by team' }),
    roleFilter: (page, name) => page.getByRole('group', { name: 'Filter roles by team' }).getByRole('button', { name: new RegExp(`^${name}\\b`) }),
    // One About and one Apply button per role. Apply only opens the modal;
    // the tests never go on to the application form.
    roleAboutButtons: page => page.getByRole('button', { name: 'About', exact: true }).filter({ visible: true }),
    roleApplyButtons: page => page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }),
    roleDialog: page => page.getByRole('dialog').filter({ visible: true }),
    roleDialogClose: page => page.getByRole('dialog').filter({ visible: true }).getByRole('button', { name: 'Close application' }),
    notFoundHeading: page => page.getByRole('heading', { level: 1, name: /didn.t ship/i }),
    // A link in the page's content whose name contains this text (a case
    // study's link name also carries its sector and summary).
    contentLink: (page, text) => page.getByRole('link', { name: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first(),
    embed: (page, title) => page.locator(`iframe[title="${title.replace(/"/g, '\\"')}"]`),
    mainLandmark: page => page.locator('main, [role="main"]'),
    headerLandmark: page => page.locator('header, [role="banner"]'),
  },
};
