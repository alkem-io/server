# Contract: level-zero space lookup for a CollaboraDocument

**No external contract changes in this feature.** The GraphQL schema is untouched — no field added, removed, or deprecated — so no schema regeneration and no schema-contract diff. This document covers the one *internal* contract the work introduces, plus the one it removes, because four call sites depend on both.

---

## Added

### `CommunityResolverService.getLevelZeroSpaceIdForCollaboraDocument`

```ts
public async getLevelZeroSpaceIdForCollaboraDocument(
  collaboraDocumentID: string
): Promise<string>
```

**Returns**: the `levelZeroSpaceID` of the space that owns the callout the document is attached to.

**Throws**: `EntityNotFoundException` when the document is attached to no callout, or the callout resolves to no space. The document id goes in the exception `details`, never in the message.

**Guarantees**:

| # | Guarantee |
|---|---|
| C1 | Every database hop is a single-row lookup against an existing index. No statement joins across the callout graph. |
| C2 | At most three statements; one on the common (contribution-hosted) path. |
| C3 | Returns the same value the removed two-call pair returned, for every document that pair could resolve. |
| C4 | Read-only. No writes, no entity mutation, no events. |
| C5 | Carries an inline comment explaining why the traversal is leaf-first — the constitution requires this of performance-sensitive queries. The comment explains the optimization without naming any spec, feature, or issue identifier. |

**Naming**: matches the three siblings already in the class — `getLevelZeroSpaceIdForRoleSet`, `getLevelZeroSpaceIdForCalloutsSet`, `getLevelZeroSpaceIdForMediaGallery`.

**Composition**: resolves the owning callout's `calloutsSetId` from the document, then delegates to the existing `getLevelZeroSpaceIdForCalloutsSet`. That second half is not reimplemented.

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

## Call-site migration

Each of the four sites replaces this:

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

The surrounding `try`/`catch` and its `logger.error` stay exactly as they are — the failure mode is unchanged, so the handling should be too.

| Site | File | Also detached? |
|---|---|---|
| 1 | `collabora.document.resolver.queries.ts` — `collaboraEditorUrl` | yes |
| 2 | `collabora.document.resolver.mutations.ts` — replace document | yes |
| 3 | `callout.resolver.mutations.ts` — `importCollaboraDocument` | yes |
| 4 | `collaborative-document-integration.service.ts` — contribution event consumer | **no** — keeps awaiting |

## Reporter invocation contract

Unchanged at every site, and this is what SC-005 checks: the same reporter method is called with the same `{ id, name, space }` contribution details and the same actor context. Only the moment of the call moves, and only at sites 1–3. Values generated per record — timestamps, the Elasticsearch document id — are outside the comparison.
