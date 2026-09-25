# 📊 QA Metrics Dashboard

> **Automated Quality Gate Report**

**Last Updated:** Friday, September 25, 2026 at 3:49 PM | **Env:** STAGING | **Branch:** main
**Run:** [#14](https://github.com/karimarie67/QA-jahnelgroup/actions/runs/36181406831)

---

## 🎯 Executive Summary

| Metric | Current Value | Status |
|--------|---------------|----------------|
| **Pass Rate** | **90.5%** | 🟡 Good |
| **Duration** | **5m 45s** | ✅ Good |
| **Total Tests** | 22 | 19 Pass (0 flaky) / 2 Fail / 1 Skipped |
| **Functional** | 6 Tests | ✅ Active |

---

### 🌐 Browser Breakdown

| Project | Pass Rate | Status |
|---|---|---|
| **staging** | 90.0% | 🟡 |
| **staging-mobile** | 90.9% | 🟡 |


---

## 🔍 Detailed Test Results

### 🔥 Smoke Tests
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 2.5s | staging |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 10.3s | staging |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 12.8s | staging |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 87.8s | staging |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 3.1s | staging |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 2.0s | staging |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 1.8s | staging |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ⏭️ skipped | <1s | staging |
| TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading | ✅ passed | 2.7s | staging-mobile |
| TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact | ✅ passed | 12.7s | staging-mobile |
| TC_SMOKE_003 Services menu opens and reaches each service page | ✅ passed | 15.4s | staging-mobile |
| TC_SMOKE_004 Every page loads with its own title and a main heading | ❌ failed | 134.5s | staging-mobile |
| TC_SMOKE_005 Footer shows the contact details and links to the site's pages and social profiles | ✅ passed | 3.1s | staging-mobile |
| TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA | ✅ passed | 3.1s | staging-mobile |
| TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role's details open and close | ✅ passed | 2.5s | staging-mobile |
| TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes | ✅ passed | 13.5s | staging-mobile |


### 🧩 Functional Tests (Errors, Docs, Search)
| Test Name | Status | Duration | Project |
|-----------|--------|----------|---------|
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 1.1s | staging |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.7s | staging |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 13.4s | staging |
| TC_ERROR_001 Unknown page shows the 404 page | ✅ passed | 1.1s | staging-mobile |
| TC_ERROR_004 Malformed addresses never cause a server error | ✅ passed | 2.5s | staging-mobile |
| TC_ERROR_005 Outbound links lead somewhere | ✅ passed | 16.5s | staging-mobile |


---

## 📈 History (Last 10 Runs)
| Date | Pass Rate | Duration | Failures |
|------|-----------|----------|----------|
| Sep 25 | 90.5% | 5m 45s | 2 |
| Sep 22 | 16.0% | 1m 11s | 21 |

---
