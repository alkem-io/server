# Image size / digest evidence (US5-AS1, SC-001) — post CVE-fix rebuild

Superseded reading of `.docker/distroless-image-smoke.sh`'s baseline note (T001):
baseline is `alkemio/server:latest` (Docker Hub, amd64, pulled 2026-07-23),
`317,579,664` compressed bytes (`docker save | wc -c`) — the dev-orchestration-pinned
SHA tag 404'd from this worktree; see the smoke script header for full provenance.

| Image | Digest (`docker inspect --format '{{.Id}}'`) | Size (docker save, bytes) | Reduction vs baseline |
|---|---|---|---|
| Baseline (`alkemio/server:latest`, pre-distroless) | n/a (Docker Hub tag, not locally re-verified this pass) | 317,579,664 | — |
| Pre-fix distroless (68 fixable HIGH/CRITICAL) | `sha256:6fce68d58647a00a867f90ba295d73436e5ba147847f1852ddef9406e1ade5f5` | 176,709,632 | 44.36% |
| **Post CVE-fix distroless (this pass, 8 remaining — 2 escalated + libssl3 base package)** | `sha256:c14fb0f23db00811c6ff8bbe72d9002f7a005bc41a8f126be7c54851f036ab20` | 176,721,920 | **44.35%** |

Net effect of the whole CVE-remediation pass on image size: **+12,288 bytes**
(effectively a wash) — the dependency version bumps (axios unification, sharp
0.35.3, etc.) were offset by excluding the erroneously-materialized `-musl`
optional native binaries (`sharp`'s libvips, `@napi-rs/canvas`, `@swc/core`)
that a broader lockfile re-resolution exposed mid-pass (see
`US5-AS1-cve-remediation.md` for the full story) — without that exclusion the
image would have grown to 209,794,048 bytes (33.94% reduction, **below** the
40% SC-001 floor).

## Base image digests (re-verified live against their registries during this
fix pass — both are already the exact digests pinned in `Dockerfile`; no newer
build exists under either tag as of 2026-07-23, see the libssl3 escalation in
`US5-AS1-cve-remediation.md`)

| Base | Tag | Digest |
|---|---|---|
| Builder / proddeps | `node:22.21.1-bookworm-slim` | `sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c` |
| Runtime | `gcr.io/distroless/nodejs22-debian12:nonroot` | `sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e` |

## Reproduce

```bash
docker build -t alkemio/server:026-distroless-local .
docker inspect alkemio/server:026-distroless-local --format '{{.Id}}'
docker save alkemio/server:026-distroless-local | wc -c
bash .docker/distroless-image-smoke.sh alkemio/server:026-distroless-local
```
