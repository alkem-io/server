# Research: SonarQube Static Analysis Integration

## Decisions

### D1: SonarQube blocking behavior

- **Decision**: Advisory only; SonarQube provides warnings but does not hard-block merges.
- **Rationale**: Keeps the merge policy under team control while still surfacing quality issues early; aligns with current desire not to enforce a hard gate.
- **Alternatives considered**:
  - Hard-blocking all quality gate failures on PRs.
  - Blocking only for critical issues (bugs, vulnerabilities, coverage).

### D2: Scope of analysis

- **Decision**: Run SonarQube on all pull requests targeting this repository; treat `develop` branch analysis as a byproduct of merged PRs.
- **Rationale**: PR-only analysis maximizes feedback where it matters most and keeps CI cost predictable; `develop` metrics remain useful via branch history.
- **Alternatives considered**:
  - Also running scheduled SonarQube analysis on `develop` nightly.

### D3: Credential and project configuration

- **Decision**: Manage SonarQube tokens and project keys exclusively via CI secrets; no secrets or project identifiers are committed to source.
- **Rationale**: Aligns with Secure-by-Design Integration (Principle 8); reduces risk from leaked configuration.
- **Alternatives considered**:
  - Storing project keys in repository config files.

## Best Practices & References

- Use one SonarQube project per repository with distinct branch configuration.
- Keep quality gate configuration centralized in SonarQube rather than CI scripts.
- Ensure CI steps fail fast and clearly when SonarQube is unreachable or misconfigured.
