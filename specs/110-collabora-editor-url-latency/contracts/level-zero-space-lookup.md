# Contract: level-zero space lookup for a CollaboraDocument

**No external contract changes in this feature.** The GraphQL schema is untouched — no field added, removed, or deprecated — so no schema regeneration and no schema-contract diff. This document covers the one *internal* contract the work introduces, plus the one it removes, because four call sites depend on both.

---

## Added

### `CommunityResolverService.getLevelZeroSpaceIdForCollaboraDocument`

```ts
public async getLevelZeroSpaceIdForCollaboraDocument(
  collaboraDocumentId: string
): Promise<string>
```

**Returns**: the `levelZeroSpaceID` of the space that owns the callout the document is attached to.

**Throws**: `EntityNotFoundException` when the document is attached to no callout, or the callout resolves to no space. Both not-found paths expose the exact static message `Unable to find Space for CollaboraDocument`. The document id and any resolved `calloutsSetId` go in exception `details`; a dynamic message from the delegated not-found exception must not escape. Unexpected infrastructure failures retain their original error type and context.

**Guarantees**:

| # | Guarantee |
|---|---|
| C1 | Each owner probe starts at a uniquely indexed `collaboraDocumentId`, returns at most one `calloutsSetId`, and never starts from `space` or joins the complete callout graph. Existing migrations `1777000000000-CreateCollaboraDocument` and `1777000000001-AddCollaboraDocumentToCalloutFraming` provide the two unique constraints and their PostgreSQL indexes. |
| C2 | Two statements on the common contribution-hosted path; at most three on the framing-hosted path. |
| C3 | Returns the same value the removed two-call pair returned, for every document that pair could resolve. |
| C4 | Read-only. No writes, no entity mutation, no events. |
| C5 | Carries an inline comment explaining why the traversal is leaf-first — the constitution requires this of performance-sensitive queries. The comment explains the optimization without naming any spec, feature, or issue identifier. |

**Naming**: matches the three siblings already in the class — `getLevelZeroSpaceIdForRoleSet`, `getLevelZeroSpaceIdForCalloutsSet`, `getLevelZeroSpaceIdForMediaGallery`.

**Composition**: resolves the owning callout's `calloutsSetId` from the document, then delegates to the existing `getLevelZeroSpaceIdForCalloutsSet`. That second half is not reimplemented. If delegation reports that the callouts set has no space, this method translates that expected not-found result to its own static-message exception contract. Other failures propagate unchanged.

---

## Removed

### `CommunityResolverService.getCommunityForCollaboraDocumentOrFail`

```ts
public async getCommunityForCollaboraDocumentOrFail(
  collaboraDocumentId: string
): Promise<ICommunity>
```

Deleted once its four callers migrate. It exists only to feed `getLevelZeroSpaceIdForCommunity`; no caller wants the `ICommunity` for its own sake, which is why the replacement returns the id directly and collapses two calls into one.

**Not deprecated, deleted.** A deprecation window protects external consumers; this is a private internal method whose caller set is empty after this change.

---

## Unchanged (explicitly)

`getLevelZeroSpaceIdForCommunity` **stays**. It has live callers in room events, whiteboard integration, and community service that have nothing to do with Collabora documents. Only the Collabora call sites stop using it.

---

## Consumer migration

If the Release 71 hotfix is present, the consumer bodies below are commented or bypassed. Migration restores their intended reporting behavior while replacing the removed lookup pair; it does not uncomment that pair.

The new lifecycle-event subscriber and site 4 replace this:

```ts
const community = await this.communityResolver
  .getCommunityForCollaboraDocumentOrFail(collaboraDocument.id);
const levelZeroSpaceID = await this.communityResolver
  .getLevelZeroSpaceIdForCommunity(community.id);
```

with this:

```ts
const levelZeroSpaceID = await this.communityResolver
  .getLevelZeroSpaceIdForCollaboraDocument(collaboraDocument.id);
```

The lifecycle subscriber owns its `try`/`catch` and error log. Site 4 retains its existing surrounding catch-and-log path.

| Consumer | File | Use |
|---|---|---|
| Lifecycle subscriber for sites 1–3 | `collabora.document.analytics.event.handler.ts` | Resolves `space`, then dispatches the matching lifecycle reporter |
| Site 4 | `collaborative-document-integration.service.ts` | Resolves `space` directly for its aggregate reporter payload |

## Reporter invocation contract

For sites 1–3, the subscriber calls the same reporter method with the same `{ id, name, space }` contribution details and effective actor attribution. The event supplies a copied, frozen snapshot containing only `actorID`, `isAnonymous`, and `guestName`, exactly the fields the reporter consumes. Site 4 has two separate aggregate record contracts: it keeps the same contribution-window and view-window reporter methods and their `{ id, name, space, writeActors, readonlyActors, alkemio }` payloads. Values generated inside reporters — timestamps and Elasticsearch document ids — are outside the comparison.
