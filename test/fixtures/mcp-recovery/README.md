# Recovery harness prerequisites

Preparation only. No live, native, build, resource, policy or browser result is
asserted by these files. The pinned 0.5.5 package exports `prepareSceneImport`.
Do not replace it with a preview or skip its native regression tests.

The five tests in `deployment.test.mjs` whose names do not start with `US` use
temporary executable stubs for the existing workflow branch only. They cannot
prove rendered configuration, rollout, networking or product behavior.

## Manifest handoff

The authorized stack runner must create an owner-only JSON file and explicitly
set `RECOVERY088_MANIFEST` to its absolute path. Live invocations additionally
require `RECOVERY088_LIVE_RUN` equal to the manifest's actual `runId`. Neither
variable has a default. No environment file, kubecontext, Docker context,
credential directory or shell fragment is read or executed by the harness.

This is a proposed consumer shape, **not an existing stack-runner contract**.
Main must reconcile it with the actual runner before live execution. It contains
no sample credentials, service IDs, PIDs or claimed release versions. Required
fields (see `harness.mjs` for executable validation):

- `schemaVersion: 1`, `project: forge-088-mcp-operational-recovery`, UUID `runId`,
  exact absolute `worktree`, `createdAt`/`expiresAt` within one day.
- `runDirectory`: a dedicated directory beneath the product `.forge/`, or a
  directory containing `/forge-088-mcp-operational-recovery/`. The manifest and
  evidence must physically reside inside it; escaping symlinks are rejected.
- `lockSha256`, complete `sourceHashes` (all `src` files except `.spec.ts` and
  `.it-spec.ts`), and for live use complete `buildHashes` (all `dist` files).
  Keys are repository-relative paths, values SHA-256. No build is run by tests.
- Live `authorization: isolated-fixtures-only`, `freshStorage: true`; `volumes`
  with project/runId/name/fresh=true/external=false. The runner must attest
  inspected identities, fresh storage and build/source correspondence.
- Exactly `services.api`, `mcp`, `collaboration`, `file-service`,
  `authorization-evaluation`, `postgres`, `rabbitmq`, `redis`, `elasticsearch`,
  `canary`. Each has project/runId/containerId/imageId/endpoint. Container IDs
  are inspected 64-digit IDs, image IDs are `sha256:` plus 64 hex digits.
  API and MCP containers/endpoints differ. Endpoints use numeric loopback and
  explicit ports, without userinfo or redirects; protocols are HTTP, WS,
  PostgreSQL, AMQP and Redis according to service. PostgreSQL database path is
  `/forge088_<runId-without-hyphens>` (the complete run identity, within the 63-byte
  PostgreSQL identifier limit); RabbitMQ uses its
  supported default vhost on the inspected fresh project-owned broker (empty,
  `/` or `/%2F` path); Redis uses `/0` on its inspected dedicated fresh instance,
  since the application does not implement a configurable key prefix. Credentials
  belong only to this fresh run. No endpoint may resolve to developer storage.
  Each service requires an `inspection` hashed descriptor containing sanitized
  Docker inspect identity, Image, Created, Config.Labels, NetworkSettings.Ports
  and Mounts. Do not include Env or credentials. The inspected Compose project
  and service must match, creation must follow manifest creation, publication
  must bind exclusive loopback, and mounts must be fresh declared volumes or
  run-local `.forge` binds. The harness does not call Docker to obtain these.
- `producer`: actual registry `version`, `integrity`, `headlessSha256`,
  `registry: https://registry.npmjs.org`, `humanPublished: true`. Version must
  match the installed package; integrity must match its lockfile resolution.
- `actorHeader`: actual configured collaboration actor header.
- `fixtures.runId`, `fixtures.actors` with `author`, `secondAuthor`, `reader`,
  `denied` and optional `authorAlias`, each containing actual actor `id` and
  freshly issued `apiKey`. Keys must carry the actual required MCP scopes.
- `fixtures.boards`: `{id, role}` for `collision`, `negative`, `text`, `faults`,
  `cold`, `legacy`. These must be created through ordinary authorized platform APIs;
  legacy fixture construction must be explicitly owned by the stack runner.
  Collision board starts with all scene element/group/frame/file identities;
  text/negative/fault boards are independently disposable. Reader has real READ
  without UPDATE_CONTENT; denied has neither; secondAuthor can update collision.
- `fixtures.media`: `readableForeignFileId`, `deniedFileId`, `missingFileId`;
  ordinary run-owned logical file fixtures, with a foreign source bucket and
  a freshly reserved nonexistent ID for the missing-file negative.
- `fixtures.disabledApiMcp: true`: runner attests that the ordinary API listener
  exposes MCP while explicitly disabling its executor. No third test-only
  public listener or execution mode is introduced.
- `fixtures.domain`: real `calloutId`, `templateId`, `spaceId`, nonempty
  `visibleContributionIds`, `otherSpaceContributionIds`, `searchQuery`, and
  `searchMatches: [{id, displayName, private}]`. Seed two real spaces and actual
  DB/ES profile relations. No mock query builder or open-auth room is sufficient.
- `fixtures.canaryCounter`: descriptor for a freshly zero-valued `{requests}`
  counter maintained by the run-owned canary. The runner must flush pending
  requests before attesting zero. Its immutable zero hash detects any change.

Evidence descriptors are `{path, sha256}`. Paths must be absolute and remain
inside `runDirectory`. Hash mismatch is failure. The harness reads external
evidence; it does not launch cluster, proxy or resource orchestration.

`overlays` must contain exactly the four infrastructure overlays acceptance,
production, acceptance-v3, production-v3 and three dev overlays dev, test,
sandbox. IDs are `<repo>/<overlay>`. Each has `render` descriptor,
`imageProvenance: {image, digest, releasedSource}`, exact reviewed
`expectedResources`, and `stage`. `foundation-disabled` additionally requires
`pendingFeatureImage: true`, `pendingCapacity: true`; no unmeasured executor
settings are allowed. `measured-feature` requires measured `executor` env keys,
capacity evidence and the published handoff. These checks read all supplied
rendered YAML; they never invoke kustomize or kubectl.

## External observations still required

- `observations.coldRead`: runId/boardId/collaborationContainerId,
  observersClosedAt/durableAt/restartAt/reconnectedAt (epoch milliseconds),
  durableVersion/checkpointSha256/sceneSha256. The runner owns the restart and
  must schedule this check on the separate cold board after durable import and
  eviction. The scene digest is SHA-256 of JSON `{elements, files, appState}`
  with the production reader's elements sorted by index. A new Y.Doc alone
  is not eviction evidence. Browser cold reopening remains separate.
- `observations.socketFaults`: raw real socket/child captures, media audit and
  cold-read descriptors for the fault cases explicitly enumerated in
  `faults.test.mjs`. Captures include actual outbound update byte descriptors.
  Upload cancellation requires `childPid: null`, no child lifecycle events or
  updates, and `mediaAudit.settled: true` after fresh-media cleanup. Other fault
  phases require an actual child PID and PREPARED evidence.
  PREPARED digest alone cannot prove byte replay. Parent media compensation
  needs real upload/delete/reuse observations; the direct child test has no
  media materialization owner. No new product hooks are authorized.
- `observations.capacity`: external experiment receipt with actual candidate
  cells and raw cgroup/process/native/CPU/admission/API samples. The assertions
  in `resources.test.mjs` check bounded candidates/repetitions, N/P aliases,
  overflow, margin, cleanup, baseline and termination. This file is an evidence
  consumer, **not an implemented experiment runner**. The larger candidate
  requires an authorized host with room for the full dependency topology.
- `observations.policy`: actual verified HQ `verification/policy-engine.mjs`
  launcher/log, exact rendered product policies and probes, target-owned
  create/upload/download receipt, manifest-attested teardown. The existing
  launcher's fixture smoke is tooling evidence only. Its current smoke mode
  does not supply this product receipt. Main must extend external orchestration
  in its owning scope; this harness never applies policies or invents a cluster.
  Product negative probes use `app=forge-policy-denied`; the ordinary API label
  is deliberately allowed by actual product policies and cannot be a negative
  source merely because the tooling smoke used it. Captured applied dependency
  policies must equal the relevant rendered YAML objects exactly.

All external observation formats are harness proposals requiring runner
integration. No evidence files or success receipts are supplied here.

## Scenario coverage authored, all live execution unrun

| Scenario | Implemented assertions | Remaining prerequisite/coverage |
|---|---|---|
| US1-AS1 | import graph, geometry/order/text/assets/appState; independent cold session check | real published fixture validation, target file read/ownership and browser usefulness; runner eviction/checkpoint |
| US1-AS2 | two MCP imports, colliding destination identities and concurrent real session edit | browser edit track, forced allocator collisions and independent group/asset-map collision proof |
| US1-AS3 | invalid-last/duplicate/dangling/version/empty/unknown-type rejection and unchanged room; malformed legacy raw bytes unchanged | legacy fixture provisioning; spawn/upload audit |
| US1-AS4 | embedded import, standard sourceFiles, denied/missing/dual/unreferenced source rejection, denied target/read, read-only room, URL canary | dedup/target file ownership/readback and canary flush observations |
| US1-AS5 | exact complete 262144/262145 decoded JSON-RPC bodies including inline image encoding through initialized SDK session | no-spawn/no-upload external audit |
| US2-AS1 | natural text/label geometry and longer natural setText | durable cold/browser parity and released baseline gates |
| US2-AS2 | width wrapping/fontSize, schema excludes height, explicit height-only/width+height rejection | canonical minimum-width parity, fixed/bound subsequent setText |
| US2-AS3 | actual elements fontSize/containerId including null | browser/cold verification |
| US3-AS1 | blank/template/space creation calls and retired content rejection | exact template/blank readback, mutation audit and target-owned file roundtrip |
| US3-AS2 | real scoped contribution IDs across two spaces and denied actor | actual fixture provisioning; unchanged domain access evidence |
| US3-AS3 | loaded search display names and denied private results | scoped GraphQL search (current MCP tool has no scope argument), ES credential vs initialization failures |
| US3-AS4 | disabled ordinary API executor returns unavailable, distinct real authorization denial | real refused/aggregate/timeout adapter diagnostic gates remain main-owned and unrun here |
| US4-AS1 | production child PREPARED/CANCEL/stale-GO/IPC/kill/deadline, unchanged live room; external evidence assertions | parent cancellation/media compensation and post-GO process/socket observations |
| US4-AS2 | external bounded experiment assertions | full stack experiment runner, measured cgroup/native/CPU/API samples, aliases, kill/OOM and browser pressure |
| US4-AS3 | five existing offline workflow branches; all seven rendered overlay assertions; external policy receipt assertions | fresh renders/image provenance/resources; actual product-policy orchestration and upload roundtrip |
| US4-AS4 | external byte-for-byte replay and semantic-effect assertions | real reconnect fault capture, durable cold result, human rollback/browser track |

No row is marked complete. Missing prerequisites fail; none become skipped
or synthetic passes. Run only focused offline workflow/syntax/lint and guard
rejections while publication and a fresh authorized stack are absent.
