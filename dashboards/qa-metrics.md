# 📊 QA Metrics Dashboard

> **Automated Quality Gate Report**

**Last Updated:** Monday, September 28, 2026 at 9:48 AM | **Env:** STAGING | **Branch:** main
**Run:** [#19](https://github.com/karimarie67/QA-jahnelgroup/actions/runs/36429584531)

---

## 🎯 Executive Summary

| Metric | Current Value | Status |
|--------|---------------|----------------|
| **Pass Rate** | **79.4%** | 🔴 Attention |
| **Duration** | **17m 28s** | ⚠️ Long |
| **Total Tests** | 36 | 27 Pass (0 flaky) / 7 Fail / 2 Skipped |
| **Functional** | 20 Tests | ✅ Active |

---

### 🌐 Browser Breakdown

| Project | Pass Rate | Status |
|---|---|---|
| **staging** | 81.3% | 🔴 |
| **staging-mobile** | 77.8% | 🔴 |


---

## 🔍 Detailed Test Results

### 🔥 Smoke Tests
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 1.7s | staging |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 7.6s | staging |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 10.1s | staging |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 75.3s | staging |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 2.4s | staging |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 1.9s | staging |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 2.5s | staging |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ⏭️ skipped | <1s | staging |
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 2.2s | staging-mobile |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 11.3s | staging-mobile |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 13.5s | staging-mobile |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 113.1s | staging-mobile |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 2.6s | staging-mobile |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 2.3s | staging-mobile |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 2.4s | staging-mobile |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ✅ passed | 11.5s | staging-mobile |


### 🧩 Functional Tests (Errors, Docs, Search)
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 2.9s | staging |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.8s | staging |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 13.9s | staging |
| TC_CONSOLE_001 No page runs the ads pixel in debug mode | ❌ failed | 22.1s | staging |
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 1.5s | staging-mobile |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.3s | staging-mobile |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 15.5s | staging-mobile |
| TC_CONSOLE_001 No page runs the ads pixel in debug mode | ❌ failed | 23.9s | staging-mobile |
| TC_A11Y_001 Every page has a main and a header landmark | ❌ failed | 298.2s | staging |
| TC_A11Y_002 Phone menu button says whether the menu is open | ⏭️ skipped | <1s | staging |
| TC_A11Y_001 Every page has a main and a header landmark | ❌ failed | 349.4s | staging-mobile |
| TC_A11Y_002 Phone menu button says whether the menu is open | ❌ failed | 26.7s | staging-mobile |
| TC_CONTENT_001 Case Studies page links to its three case studies | ✅ passed | 3.5s | staging |
| TC_CONTENT_002 Videos and Our HQ embed their videos, map, and tour, each with a title | ✅ passed | 5.2s | staging |
| TC_CONTACT_001 Contact page's phone and email are links | ✅ passed | 2.2s | staging |
| TC_CAREERS_001 Careers previews open roles and See All Positions opens Open Positions | ✅ passed | 1.6s | staging |
| TC_CONTENT_001 Case Studies page links to its three case studies | ✅ passed | 4.8s | staging-mobile |
| TC_CONTENT_002 Videos and Our HQ embed their videos, map, and tour, each with a title | ✅ passed | 5.7s | staging-mobile |
| TC_CONTACT_001 Contact page's phone and email are links | ✅ passed | 2.4s | staging-mobile |
| TC_CAREERS_001 Careers previews open roles and See All Positions opens Open Positions | ✅ passed | 2.6s | staging-mobile |


---

## 📈 History (Last 10 Runs)
| Date | Pass Rate | Duration | Failures |
|------|-----------|----------|----------|
| Sep 28 | 79.4% | 17m 28s | 7 |
| Sep 25 | 90.5% | 4m 51s | 2 |
| Sep 25 | 90.5% | 5m 45s | 2 |
| Sep 22 | 16.0% | 1m 11s | 21 |

---
