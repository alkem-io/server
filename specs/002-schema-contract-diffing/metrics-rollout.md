# Metrics & Rollout Plan – Feature 002 (Schema Contract Diffing & Enforcement)

Status: Draft (pre-merge)
Owner: Schema Governance WG / Backend Lead

## 1. Objectives

Track adoption quality, gate effectiveness, and long-term stability impact of the schema contract diffing feature.

## 2. KPIs & Definitions

| KPI                        | Definition                                                                                                | Target                                      | Collection Method                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Blocked Breaking Changes   | Count of CI workflow failures due to unapproved BREAKING / PREMATURE_REMOVAL / INVALID_DEPRECATION_FORMAT | Baseline establish (Week 1), trend downward | GitHub Actions run results (matrix export)                     |
| Override Rate              | (# BREAKING with overrideApplied) / (total BREAKING detected)                                             | < 25% of BREAKING attempts                  | Parse `change-report.json` artifact on successful gated merges |
| False Positive Rate        | (# logged FP issues) / (total schema-change PRs)                                                          | < 5%                                        | See Section 6 logging workflow                                 |
| Mean Deprecation Lead Time | Average days between deprecation introduction and REMOVE_AFTER date                                       | >= 90 days (policy minimum)                 | Derived from `deprecations.json` schedule entries              |
| Grace Period Compliance    | % of GRACE entries converted to valid schedule before graceExpiresAt                                      | 100%                                        | Compare successive PR reports                                  |
| Diff Runtime               | Median runtime of diff step in CI                                                                         | < 5s                                        | GitHub Actions step timing                                     |

## 3. Data Sources

- CI workflow `schema-contract.yml` logs & artifacts
- Stored PR comments (classification table snapshot)
- Optional future: metrics export script aggregating last N runs

## 4. Collection Automation (Phase 2 Enhancement Candidate)

A lightweight script (`scripts/schema/collect-metrics.ts`) could:

1. Download latest successful run artifacts for default branch.
2. Append anonymized row to `specs/002-schema-contract-diffing/metrics/history.csv`.
3. Compute rolling averages & raise alerts (GitHub Issue) when thresholds breached.

(Deferred until initial manual baseline established.)

## 5. Rollout Stages

| Stage                    | Description                                               | Actions                         | Exit Criteria                                   |
| ------------------------ | --------------------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| A: Soft Launch           | Feature branch PRs only                                   | Observe reports, tune messaging | Stable classifications with no unexpected noise |
| B: Protected Branch Gate | Enable required status for `schema-contract` on `develop` | Branch protection update        | 2 weeks of <5% false positives                  |
| C: Organization Adoption | Communicate policy to all contributors                    | Announce + link quickstart      | 100% schema PRs referencing checklist           |
| D: Optimization          | Performance & DX improvements                             | Add caching, faster bootstrap   | Diff runtime p95 < 6s                           |

## 6. False Positive Logging Process

Label: `schema-contract:fp`

SLA: Initial triage within 2 business days; resolution decision within 5 business days.

Workflow:

1. Developer suspects misclassification → opens Issue with label `schema-contract:fp`.
2. Include:
   - PR link
   - Extracted change entry JSON
   - Expected classification + rationale
3. Triage (within SLA): governance reviewer assigns root cause code:
   - `RULE_GAP` (heuristic too coarse)
   - `PARSE_ERROR` (SDL parsing nuance)
   - `EDGE_CASE` (rare pattern not modeled)
4. Resolution Paths:
   - Adjust classification logic (tests first)
   - Amend documentation (if intended behavior)
   - Add override guidance (if truly edge)
5. Close issue with patch PR link; update metrics (increment false positive count only if rule changed or doc clarified).

## 7. Reporting Cadence

- Weekly: KPI snapshot posted as comment in tracking issue.
- Monthly: Trend chart (manual for first month; scripted later).

## 8. Risk Mitigations

| Risk                                | Mitigation                                         |
| ----------------------------------- | -------------------------------------------------- |
| Override phrase misuse              | CODEOWNER validation + explicit review state check |
| Metric drift (manual inconsistency) | Automate collection after baseline                 |
| Classification churn causing noise  | Version classification logic; document changes     |
| Missed grace follow-up              | Add reminder to PR template (already present)      |

## 9. Future Enhancements

- Historical timeline visualization of schema size & additive vs breaking ratio.
- Git notes or separate branch storing periodic snapshots for audit.
- Optional Slack webhook when a breaking attempt blocked.

## 10. Acceptance Alignment

These metrics demonstrate feature success against spec success criteria: stability (blocked unapproved breakings), governance adoption (override rate), and policy compliance (deprecation lifecycle).

---

Prepared by: Spec automation agent
