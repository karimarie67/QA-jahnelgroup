/**
 * tag-check.js: the tag rules CI's test selection depends on.
 *
 * CI and the npm scripts select tests by suite tag (`--grep @smoke`,
 * `--grep @regression`), so a test with the wrong tags runs nowhere, or in the
 * wrong job. findTagProblems reads `playwright test --list --reporter=json`
 * and reports each test that breaks a rule:
 *
 * - exactly one suite tag (@smoke, @regression, @links);
 * - the suite tag fits the file: @links only and always on check-links.spec.js
 *   (its own project); *.auth.spec.js and *.setup.js are @regression (only
 *   the functional job runs the logged-in projects);
 * - nothing that would fool --grep, which matches substrings of the project
 *   name, the file path, the describe titles and the title, plus the tags: no
 *   tag that extends a suite tag's name (@smoke-visual), and no suite tag in
 *   a title, a describe title, a file path, or a project name.
 *
 * template-check runs it on every push and PR.
 */

export const SUITE_TAGS = ['@smoke', '@regression', '@links'];

// The JSON lists tags without their '@'.
const withAt = tag => (tag.startsWith('@') ? tag : `@${tag}`);
const mentionsSuiteTag = text => SUITE_TAGS.some(tag => text.includes(tag));

/**
 * @param {object} report - `playwright test --list --reporter=json` output
 * @returns {string[]} one line per problem; empty when every test is fine
 */
export function findTagProblems(report) {
  const problems = [];

  for (const project of report.config?.projects || []) {
    if (mentionsSuiteTag(project.name)) {
      problems.push(`project "${project.name}": its name contains a suite tag, so --grep would select every test in it`);
    }
  }

  const seen = new Set();
  const walk = (suite, describes) => {
    for (const spec of suite.specs || []) {
      const titlePath = [...describes, spec.title];
      const key = `${spec.file} › ${titlePath.join(' › ')}`;
      if (seen.has(key)) continue; // the same test, listed for another project
      seen.add(key);
      problems.push(...problemsFor(spec, titlePath).map(p => `${key}: ${p}`));
    }
    for (const child of suite.suites || []) walk(child, [...describes, child.title]);
  };
  // The top-level suites are files; their titles are file paths, not describes.
  for (const file of report.suites || []) walk(file, []);
  return problems;
}

function problemsFor(spec, titlePath) {
  const tags = [...new Set((spec.tags || []).map(withAt))];
  const suite = tags.filter(t => SUITE_TAGS.includes(t));
  const shown = tags.length ? tags.join(' ') : 'none';
  const problems = [];

  if (suite.length !== 1) {
    problems.push(`needs exactly one suite tag (${SUITE_TAGS.join(', ')}); has ${shown}`);
  }
  const base = spec.file.split('/').pop();
  if (base === 'check-links.spec.js' && !(suite.length === 1 && suite[0] === '@links')) {
    problems.push('the link checker must be tagged @links (it runs on its own project)');
  }
  if (base !== 'check-links.spec.js' && suite.includes('@links')) {
    problems.push('only check-links.spec.js may be @links: the link-checker project runs nothing else');
  }
  if (/\.auth\.spec\.js$|\.setup\.js$/.test(base) && suite.length === 1 && suite[0] !== '@regression') {
    problems.push('a logged-in spec or setup must be @regression: only the functional job runs the logged-in projects');
  }
  for (const tag of tags) {
    if (!SUITE_TAGS.includes(tag) && SUITE_TAGS.some(s => tag.startsWith(s))) {
      problems.push(`tag ${tag} starts with a suite tag's name, so --grep would select it as that suite`);
    }
  }
  if (titlePath.some(mentionsSuiteTag)) {
    problems.push('a title or describe title contains a suite tag, which --grep would match');
  }
  if (mentionsSuiteTag(spec.file)) {
    problems.push('the file path contains a suite tag, which --grep would match');
  }
  return problems;
}
