# Quickstart: Verifying ARC Runner Migration

## Prerequisites

1. ARC controller installed on the Kubernetes cluster
2. Infra manifests applied:
   - `contracts/arc-nfs-cache-server.yaml` — NFS cache server (PVC + Deployment + Service)
   - ARC Helm values configured in infra repo (full pod template with DinD + NFS mount)
   - `contracts/arc-pnpm-store-prune-cronjob.yaml` — Daily atime-based cache maintenance
3. NFS server running: `kubectl get pods -l app.kubernetes.io/name=pnpm-cache-nfs`
4. Runner pods spawning and registering with GitHub (check `gh api repos/alkem-io/server/actions/runners`)

## Verification Per PR

### PR 1 — Low Risk (Runner Swap + Legacy CI Cleanup)

**Infra prerequisite**: NFS cache server deployed, ARC runner with NFS mount.

```bash
# 1. Push PR branch, verify review-router.yml runs on arc-runner-set
gh pr create --title "chore: migrate low-risk workflows to arc-runner-set"

# 2. Check workflow run (after PR triggers)
gh run list --branch <pr-branch> --workflow review-router.yml

# 3. After merge, verify on develop:
gh run list --branch develop --workflow "CI Tests"  # new Travis replacement
```

**What to check**:
- `review-router.yml` job shows `arc-runner-set` in the "Set up job" log
- New CI Tests workflow passes `pnpm run test:ci:no:coverage`
- `.travis.yml` and `trigger-e2e-tests.yml` are gone

### PR 2 — Medium Risk (Node.js/pnpm Workflows)

**Infra prerequisite**: Same as PR 1 (no DinD needed).

```bash
# 1. Push PR with code change (to trigger schema-contract)
# 2. Verify schema diff comment appears on PR
# 3. After merge to develop, verify schema-baseline runs
gh run list --branch develop --workflow schema-baseline.yml
```

**What to check**:
- Schema contract posts diff comment on PR
- SonarQube scan completes and reports quality gate
- Schema baseline creates/updates baseline PR after merge to develop
- pnpm install uses the NFS cache (check "Install dependencies" step timing)

### PR 3 — High Risk (K8s Deploy with DinD)

**Infra prerequisite**: DinD sidecar active in runner pods (`privileged: true`).

```bash
# 1. Verify DinD is working before merging:
#    Run a test workflow that does `docker info` on arc-runner-set
# 2. After merge to develop, verify dev deploy:
gh run list --branch develop --workflow "Build, Migrate & Deploy to Dev on Hetzner"
# 3. Verify cluster health:
kubectl --kubeconfig=<dev-config> get pods -n <namespace> | grep server
```

**What to check**:
- Docker build succeeds inside DinD sidecar
- Image pushed to ACR
- K8s deploy completes, pods are healthy
- Registry-backed Docker cache is populated (second run should be faster)

### PR 4 — Highest Risk (Docker Hub Release with QEMU/Buildx)

**Infra prerequisite**: Same as PR 3 (DinD with `--privileged`).

```bash
# 1. Create a test pre-release to trigger the workflow
gh release create v99.0.0-test --prerelease --notes "Test ARC migration"
# 2. Verify Docker Hub image
docker manifest inspect alkemio/server:v99.0.0-test
# 3. Clean up test release from GitHub
gh release delete v99.0.0-test --yes
# 4. Clean up test tag from Docker Hub (prevents public artifact leak)
DOCKER_HUB_TOKEN=$(curl -s -H "Content-Type: application/json" \
  -X POST -d '{"username":"'$DOCKERHUB_USERNAME'","password":"'$DOCKERHUB_TOKEN'"}' \
  https://hub.docker.com/v2/users/login/ | jq -r .token)
curl -s -X DELETE \
  -H "Authorization: JWT $DOCKER_HUB_TOKEN" \
  "https://hub.docker.com/v2/repositories/alkemio/server/tags/v99.0.0-test/"
```

**What to check**:
- QEMU + Buildx setup succeeds inside DinD
- Multiplatform image (amd64 + arm64 if enabled) pushed to Docker Hub
- Registry-backed build cache populated in GHCR
- Old workflow `build-release-docker-hub.yml` is deleted

## Rollback

All PRs can be reverted to restore `ubuntu-latest`:
```bash
# 1. Revert the merge commit on develop
git checkout develop && git pull
git revert -m 1 <merge-commit-sha>
git push origin develop

# 2. Open a PR for the revert (for audit trail)
gh pr create --title "revert: restore ubuntu-latest for <workflow>" --body "Reverts PR #N"
```

For High/Highest tiers, also re-trigger the deployment/release workflow from the reverted state to restore the last known-good deployment or image.
