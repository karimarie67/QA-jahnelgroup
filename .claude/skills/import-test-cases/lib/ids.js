/**
 * ids.js
 *
 * Test case ID rules shared by validate, reconcile, and the CLI's
 * `next-id` / `assign-ids` commands.
 */

/** Matches a well-formed test case ID: `TC_<AREA>_<NNN...>`. */
export const TC_ID = /^TC_([A-Z0-9]+)_(\d{3,})$/;

/**
 * Derive an area code from a case's section.
 * @param {string|null} section
 * @returns {string} first word of `section`, uppercased, non-alphanumerics
 *   removed, max 8 chars; `GEN` when that yields nothing.
 */
export function areaFromSection(section) {
  const firstWord = (section ?? '').trim().split(/\s+/)[0] ?? '';
  const cleaned = firstWord.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return cleaned || 'GEN';
}

/**
 * Collect every test case ID mentioned anywhere in the given texts.
 * @param {{texts: string[]}} args
 * @returns {Set<string>}
 */
export function collectUsedIds({ texts }) {
  const used = new Set();
  const pattern = /TC_[A-Z0-9]+_\d{3,}/g;
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(pattern)) used.add(match[0]);
  }
  return used;
}

/**
 * The next free ID in an area.
 * @param {string} area
 * @param {Set<string>} used - IDs already in use (any area)
 * @returns {string} `TC_<area>_<NNN>`, one past the highest used number in
 *   that area, zero-padded to 3 digits; `001` when the area is unused.
 */
export function nextId(area, used) {
  const pattern = new RegExp(`^TC_${area}_(\\d{3,})$`);
  let max = 0;
  for (const id of used) {
    const match = id.match(pattern);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `TC_${area}_${String(max + 1).padStart(3, '0')}`;
}

/**
 * Assign `import.test_case_id` to every case that needs one.
 * @param {object[]} cases - normalised cases carrying an `import` object
 * @param {Set<string>} used - IDs already in use, from `collectUsedIds`
 * @returns {object[]} a new array; `cases` and `used` are not mutated
 */
export function assignIds(cases, used) {
  const usedIds = new Set(used);
  return cases.map(c => {
    const imp = c.import ?? {};
    let test_case_id = imp.test_case_id ?? null;

    if (!test_case_id) {
      if (imp.bucket === 'stale') {
        test_case_id = null;
      } else if (imp.covered_by) {
        test_case_id = imp.covered_by;
      } else if (c.client_id && TC_ID.test(c.client_id)) {
        test_case_id = c.client_id;
      } else {
        test_case_id = nextId(areaFromSection(c.section), usedIds);
        usedIds.add(test_case_id);
      }
    }

    return { ...c, import: { ...imp, test_case_id } };
  });
}
