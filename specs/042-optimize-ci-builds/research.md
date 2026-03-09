# Research: Optimize CI Builds

## R1: SonarQube Scanner on macOS Apple Silicon

**Decision**: Keep `sonarsource/sonarqube-scan-action@v7` — it is a Node.js action (not Docker) and works natively on macOS ARM64.

**Rationale**: Since v4.0.0, the SonarQube scan action switched from Docker to Node.js (`runs: using: node20`). It downloads the SonarScanner CLI binary at runtime and executes it natively on the host OS. No replacement needed.

**Verification**: The `action.yml` for v7 confirms:
```yaml
runs:
  using: node20
  main: dist/index.js
```

The `sonar-project.properties` file already exists and configures all scan parameters — the action reads it automatically via the `projectBaseDir` input.

**Alternatives considered**:
- Replace with direct CLI invocation: Unnecessary — the action already works on macOS
- Keep SonarQube job on a separate Linux runner: Unnecessary — the action runs natively on macOS ARM64

---

## R2: Unified CI + SonarQube Workflow Architecture

**Decision**: Merge `ci-tests.yml` and `trigger-sonarqube.yml` into a single workflow with two jobs: `test` → `sonarqube`.

**Rationale**: Currently tests run twice per PR — once without coverage in `ci-tests.yml` and once with coverage in `trigger-sonarqube.yml`. By running tests once (with coverage) and sharing artifacts, we eliminate the duplication.

**Architecture**:
```yaml
# ci-tests.yml (unified)
jobs:
  test:
    runs-on: [self-hosted, macOS, ARM64, apple-silicon, m4]
    steps:
      - checkout, setup node, pnpm install (with caching)
      - run tests WITH coverage (pnpm run test:ci)
      - upload coverage artifacts

  sonarqube:
    needs: test
    runs-on: [self-hosted, macOS, ARM64, apple-silicon, m4]
    steps:
      - checkout (fetch-depth: 0 for SonarQube)
      - download coverage artifacts
      - run SonarScanner CLI
```

**Trigger events**: Same as current combined triggers:
- `push` to `develop`, `main` (from ci-tests.yml)
- `pull_request` against `develop`, `main` (from both)
- `workflow_dispatch` (from trigger-sonarqube.yml)

**Key details**:
- The `test` job runs `pnpm run test:ci` (with coverage), not `test:ci:no:coverage`
- Coverage output at `coverage-ci/lcov.info` is uploaded as an artifact
- SonarQube job downloads the artifact and runs scanner with existing `sonar-project.properties`
- SonarQube quality gate remains non-blocking (advisory only, `continue-on-error: true`)

**Alternatives considered**:
- Single job with all steps: Rejected — SonarQube needs `fetch-depth: 0` which is slower; keeping as separate job allows test results to report faster
- Keep as two workflows with artifact sharing: Rejected — more complex, harder to maintain

---

## R3: Apple Silicon Runner Migration — Compatibility

**Decision**: Replace `arc-runner-set` with `[self-hosted, macOS, ARM64, apple-silicon, m4]` for all Node.js CI workflows.

**Rationale**: The Apple Silicon runners are already provisioned. All Node.js tooling (Node.js 22, pnpm, TypeScript) has native ARM64 support.

**Workflows to migrate** (currently on `arc-runner-set`):
1. `ci-tests.yml` — test execution
2. `trigger-sonarqube.yml` — merged into ci-tests.yml
3. `schema-contract.yml` — schema diffing
4. `schema-baseline.yml` — schema baseline regeneration
5. `review-router.yml` — PR review metrics

**Workflows to keep on Linux** (currently on `ubuntu-latest`):
1. `build-release-docker-hub.yml` / `build-release-docker-hub-new.yml` — Docker builds require Linux
2. `build-deploy-k8s-dev-hetzner.yml` — Docker + K8s deployment
3. `build-deploy-k8s-sandbox-hetzner.yml` — Docker + K8s deployment
4. `build-deploy-k8s-test-hetzner.yml` — Docker + K8s deployment

**Compatibility notes**:
- `actions/checkout@v4`: JavaScript action — works on macOS ✓
- `pnpm/action-setup@v4`: JavaScript action — works on macOS ✓
- `actions/setup-node@v6.2.0`: JavaScript action — works on macOS ✓
- `actions/cache@v4`: JavaScript action — works on macOS ✓
- `actions/upload-artifact@v4` / `actions/download-artifact@v4`: JavaScript actions — work on macOS ✓
- `actions/github-script@v7`: JavaScript action — works on macOS ✓
- `marocchino/sticky-pull-request-comment@v2`: JavaScript action — works on macOS ✓
- `crazy-max/ghaction-import-gpg@v6`: JavaScript action — works on macOS ✓
- `actions/setup-python@v5`: JavaScript action — works on macOS ✓ (review-router.yml)
- `sonarsource/sonarqube-scan-action@v7`: Node.js action (since v4.0.0) — works on macOS ✓
- `sonarsource/sonarqube-quality-gate-action@v1`: Composite/shell action — works on macOS ✓

**Alternatives considered**:
- Keep some workflows on `arc-runner-set`: Rejected — `arc-runner-set` is being decommissioned in favor of Apple Silicon

---

## R4: Caching Strategy

**Decision**: Implement two-layer caching: (1) pnpm store cache, (2) TypeScript build output cache.

**Rationale**: Every CI run currently installs all dependencies from scratch and compiles the full TypeScript project. Caching both layers significantly reduces cold-start time.

### Layer 1: pnpm Store Cache

The `actions/setup-node@v6.2.0` with `cache: 'pnpm'` already handles pnpm store caching. This is already present in all workflows. However, the cache key is OS-based by default. We should ensure the cache key strategy uses per-branch keys with `develop` fallback.

**Implementation**: Use `actions/cache@v4` explicitly for finer control:
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.local/share/pnpm/store/v10
    key: pnpm-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-${{ runner.os }}-${{ runner.arch }}-
```

Note: Since the pnpm store is content-addressed by lockfile hash, per-branch scoping is unnecessary — the same lockfile produces the same cache. Branch-scoped keys are needed only for build output.

### Layer 2: TypeScript Build Output Cache

```yaml
- uses: actions/cache@v4
  with:
    path: |
      dist/
      tsconfig.tsbuildinfo
    key: tsc-${{ runner.os }}-${{ runner.arch }}-${{ github.ref_name }}-${{ hashFiles('src/**/*.ts', 'tsconfig.json') }}
    restore-keys: |
      tsc-${{ runner.os }}-${{ runner.arch }}-${{ github.ref_name }}-
      tsc-${{ runner.os }}-${{ runner.arch }}-develop-
```

**Note on CI test workflow**: The test job doesn't need a build cache because `vitest run` compiles on-the-fly using Vite's esbuild transformer. The TypeScript build cache is relevant for the schema workflows that run `pnpm build` or `ts-node` with full type-checking.

**Cache invalidation**: Caches are automatically evicted by GitHub Actions after 7 days of inactivity. Corrupted caches fall through to restore-keys and ultimately to uncached builds (FR-007 compliance).

**Alternatives considered**:
- `actions/setup-node` built-in cache only: Rejected — doesn't support build output caching or per-branch keys
- Custom caching with tar/upload: Rejected — over-engineering; `actions/cache` is the standard approach

---

## R5: Docker Release Workflow Consolidation

**Decision**: Delete `build-release-docker-hub.yml` (legacy) and rename `build-release-docker-hub-new.yml` to `build-release-docker-hub.yml`.

**Rationale**: Both workflows trigger on `release: [published]` events, causing duplicate Docker builds. The newer workflow uses `docker/metadata-action@v5` for tag generation, which is cleaner and more maintainable than the manual tag parsing in the legacy workflow.

**Key differences between workflows**:
| Aspect | Legacy | New |
|--------|--------|-----|
| `actions/checkout` | v3.0.2 | v4 |
| Tag generation | Manual shell script | `docker/metadata-action@v5` |
| QEMU setup | v3.0.0 | v3 |
| Buildx setup | v3.0.0 | v3 |
| Docker login | v3.0.0 | v3 |
| Build & push | v5.0.0 | v5 |
| Labels | Manual OCI labels | Auto-generated by metadata-action |
| Pre-release handling | Tags as latest regardless | Excludes `latest` tag for pre-releases |

The new workflow is strictly better: updated action versions, proper pre-release handling, and less manual scripting.

**Alternatives considered**:
- Merge features from both: Rejected — the new workflow already has all capabilities and better behavior
- Keep both with different triggers: Rejected — both trigger on the same event, causing duplication

---

## R6: SonarQube Quality Gate Check on macOS

**Decision**: Keep `sonarsource/sonarqube-quality-gate-action@v1` — it is a composite (shell-based) action and works natively on macOS.

**Rationale**: The quality gate action uses `runs: using: "composite"` with a bash script (`check-quality-gate.sh`). It is not Docker-based and runs on any OS with bash support, including macOS.

**Verification**: The `action.yml` confirms:
```yaml
runs:
  using: "composite"
  steps:
    - run: $GITHUB_ACTION_PATH/script/check-quality-gate.sh ...
      shell: bash
```

No replacement or alternative implementation needed.
