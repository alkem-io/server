# Image size / digest evidence (US5-AS1, SC-001) — post Debian-13 CVE-remediation rebuild

Superseded reading of `.docker/distroless-image-smoke.sh`'s baseline note (T001):
baseline is `alkemio/server:latest` (Docker Hub, amd64, pulled 2026-07-23),
`317,579,664` compressed bytes (`docker save | wc -c`) — the dev-orchestration-pinned
SHA tag 404'd from this worktree; see the smoke script header for full provenance.

| Image | Digest (`docker inspect --format '{{.Id}}'`) | Size (docker save, bytes) | Reduction vs baseline |
|---|---|---|---|
| Baseline (`alkemio/server:latest`, pre-distroless) | n/a (Docker Hub tag, not locally re-verified this pass) | 317,579,664 | — |
| Pre-fix distroless (68 fixable HIGH/CRITICAL, Debian 12 pair) | `sha256:6fce68d58647a00a867f90ba295d73436e5ba147847f1852ddef9406e1ade5f5` | 176,709,632 | 44.36% |
| CVE-fix pass 1 (8 remaining, Debian 12 pair — dependency overrides only) | `sha256:c14fb0f23db00811c6ff8bbe72d9002f7a005bc41a8f126be7c54851f036ab20` | 176,721,920 | 44.35% |
| **CVE-fix pass 2 — Debian 13/trixie base pair + typeorm patch (this pass, 2 remaining, both verified-unreachable residual risk)** | `sha256:2d1e86ef63b54c7302adce0f83c2b908d2175d1a99cba4aafb45e38f4de64986` | 178,728,448 | **43.72%** |

Pass 2 delta vs pass 1: +2,006,528 bytes (Debian 13/trixie base packages are
marginally larger than Debian 12/bookworm's). Still comfortably clears the
SC-001 40% floor (43.72%).

## Base image digests (re-verified live against their registries 2026-07-23,
both pulled and confirmed via `docker buildx imagetools inspect` in this pass)

| Base | Tag | Digest |
|---|---|---|
| Builder / proddeps | `node:22.21.1-trixie-slim` | `sha256:c3bf4cf764467f1bf9789fde549971a2cf8e720196df6cf3f95bafa590e5f4af` |
| Runtime | `gcr.io/distroless/nodejs22-debian13:nonroot` | `sha256:a2723a2817c5b01b8e7b98d567bc8b5a6b0e713e25bfb0a82b6ade4b9db06f50` |

Superseded (Debian 12 pair, replaced this pass because Google's distroless
project no longer builds fresh Debian-12 variants and the Node 22.21.1 tag is
itself frozen upstream — no newer Debian-12 build could ever clear the
libssl3 CVEs below):

| Base | Tag | Digest |
|---|---|---|
| Builder / proddeps (superseded) | `node:22.21.1-bookworm-slim` | `sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c` |
| Runtime (superseded) | `gcr.io/distroless/nodejs22-debian12:nonroot` | `sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e` |

## Reproduce

```bash
docker build -t alkemio/server:026-distroless-local .
docker inspect alkemio/server:026-distroless-local --format '{{.Id}}'
docker save alkemio/server:026-distroless-local | wc -c
bash .docker/distroless-image-smoke.sh alkemio/server:026-distroless-local
```
