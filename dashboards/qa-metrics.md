# 📊 QA Metrics Dashboard

> **Automated Quality Gate Report**

**Last Updated:** Tuesday, October 6, 2026 at 11:38 AM | **Env:** STAGING | **Branch:** main
**Run:** [#38](https://github.com/karimarie67/QA-jahnelgroup/actions/runs/37486754639)

---

## 🎯 Executive Summary

| Metric | Current Value | Status |
|--------|---------------|----------------|
| **Pass Rate** | **77.5%** | 🔴 Attention |
| **Duration** | **19m 45s** | ⚠️ Long |
| **Total Tests** | 42 | 31 Pass (0 flaky) / 9 Fail / 2 Skipped |
| **Functional** | 26 Tests | ✅ Active |

---

### 🌐 Browser Breakdown

| Project | Pass Rate | Status |
|---|---|---|
| **staging** | 78.9% | 🔴 |
| **staging-mobile** | 76.2% | 🔴 |


---

## 🔍 Detailed Test Results

### 🔥 Smoke Tests
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 2.8s | staging |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 8.2s | staging |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 12.6s | staging |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 38.3s ×2 | staging |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 2.6s | staging |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 1.6s | staging |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 2.4s | staging |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ⏭️ skipped | <1s | staging |
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 2.6s | staging-mobile |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 12.5s | staging-mobile |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 13.8s | staging-mobile |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 53.3s ×2 | staging-mobile |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 3.0s | staging-mobile |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 2.4s | staging-mobile |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 2.5s | staging-mobile |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ✅ passed | 10.6s | staging-mobile |


### 🧩 Functional Tests
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_A11Y_001 Every page has a main and a header landmark | ❌ failed | 158.4s ×2 | staging |
| TC_A11Y_002 Phone menu button says whether the menu is open | ⏭️ skipped | <1s | staging |
| TC_A11Y_001 Every page has a main and a header landmark | ❌ failed | 187.1s ×2 | staging-mobile |
| TC_A11Y_002 Phone menu button says whether the menu is open | ❌ failed | 15.3s ×2 | staging-mobile |
| TC_A11Y_003 No page has a serious or critical accessibility violation | ❌ failed | 37.4s | staging |
| TC_A11Y_003 No page has a serious or critical accessibility violation | ❌ failed | 37.5s | staging-mobile |
| TC_CONTENT_001 Case Studies page links to its three case studies | ✅ passed | 3.7s | staging |
| TC_CONTENT_002 Videos and Our HQ embed their videos, map, and tour, each with a title | ✅ passed | 6.0s | staging |
| TC_CONTACT_001 Contact page's phone and email are links | ✅ passed | 2.2s | staging |
| TC_CAREERS_001 Careers previews open roles and See All Positions opens Open Positions | ✅ passed | 2.1s | staging |
| TC_CONTENT_001 Case Studies page links to its three case studies | ✅ passed | 5.3s | staging-mobile |
| TC_CONTENT_002 Videos and Our HQ embed their videos, map, and tour, each with a title | ✅ passed | 6.6s | staging-mobile |
| TC_CONTACT_001 Contact page's phone and email are links | ✅ passed | 3.2s | staging-mobile |
| TC_CAREERS_001 Careers previews open roles and See All Positions opens Open Positions | ✅ passed | 3.0s | staging-mobile |
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 1.2s | staging |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.6s | staging |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 13.8s | staging |
| TC_CONSOLE_001 No page runs the ads pixel in debug mode | ❌ failed | 12.6s ×2 | staging |
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 1.2s | staging-mobile |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.6s | staging-mobile |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 19.7s | staging-mobile |
| TC_CONSOLE_001 No page runs the ads pixel in debug mode | ❌ failed | 14.7s ×2 | staging-mobile |
| TC_FORM_001 Every form field has its label, type, and required state | ✅ passed | 11.9s | staging |
| TC_FORM_001 Every form field has its label, type, and required state | ✅ passed | 12.5s | staging-mobile |
| TC_PERF_001 The key pages load within their performance budgets | ✅ passed | 9.4s | staging |
| TC_PERF_001 The key pages load within their performance budgets | ✅ passed | 9.9s | staging-mobile |


---

## 📈 History (Last 10 Runs)
| Date | Pass Rate | Duration | Failures |
|------|-----------|----------|----------|
| Oct 6 | 77.5% | 19m 45s | 9 |
| Oct 6 | 79.4% | 16m 23s | 7 |
| Sep 28 | 79.4% | 17m 33s | 7 |
| Sep 28 | 79.4% | 17m 28s | 7 |
| Sep 25 | 90.5% | 4m 51s | 2 |
| Sep 25 | 90.5% | 5m 45s | 2 |
| Sep 22 | 16.0% | 1m 11s | 21 |

---
