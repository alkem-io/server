# Conversion & Transfer Impact Analysis

**Feature**: 083-cross-space-moves | **Date**: 2026-03-31
**Pattern source**: client-web `025-admin-transfer-ui/conversion-transfer-analysis.md`

## Communities Impact

| Operation | Scope | Members | Leads | Admins | Orgs | VCs | Rationale |
|---|---|---|---|---|---|---|---|
| L1→L0 promote | same L0 | **Kept** | **Kept** | Reset | **Kept** | **Kept** | Community stays intact; admin credentials reset for new chain |
| L2→L1 promote | same L0 | **Kept** | **Kept** | Reset | **Kept** | **Kept** | Same L0 context; only parent chain changes |
| L1→L2 demote | same L0 | **REMOVED** | **REMOVED** | Reset (preserved) | **REMOVED** | **REMOVED** | Same L0; admins survive because community hierarchy is the same |
| **L1→L1 move** | **cross-L0** | **REMOVED** | **REMOVED** | **REMOVED** | **REMOVED** | **REMOVED** | Different L0 = different community hierarchy. Clean slate |
| **L1→L2 move** | **cross-L0** | **REMOVED** | **REMOVED** | **REMOVED** | **REMOVED** | **REMOVED** | Different L0 = different community hierarchy. Cannot preserve admins — they are sub-community of source L0 |
| Space→Account | account | **Kept** | **Kept** | **Kept** | **Kept** | **Kept** | Only account reference changes |

**Key insight**: The boundary is **same-L0 vs cross-L0**, not the level change direction. Any operation crossing L0 boundaries clears ALL roles because community memberships are hierarchical under the L0. An admin of an L1 in Space-X holds credentials rooted in Space-X's chain — those credentials are meaningless in Space-Y's chain.

## Content Impact

| Operation | Scope | Callouts | Contributions | Comments | Innovation Flow | Tagsets | URL Caches |
|---|---|---|---|---|---|---|---|
| L1→L0 promote | same L0 | **Kept** | **Kept** | **Kept** | **Reset to default** | **Kept** | — |
| L2→L1 promote | same L0 | **Kept** | **Kept** | **Kept** | **Kept** | **Kept** | — |
| L1→L2 demote | same L0 | **Kept** | **Kept** | **Kept** | **Kept** | **Kept** | — |
| **L1→L1 move** | **cross-L0** | **Kept** | **Kept** | **Kept** | **Synced** to target L0 | **Synced** | **Revoked** |
| **L1→L2 move** | **cross-L0** | **Kept** | **Kept** | **Kept** | **Synced** to target L0 | **Synced** | **Revoked** |
| Callout transfer | — | **Moved** | **Kept** | **Kept** | N/A | Non-default **deleted** | **Revoked** |

**Comments**: All callout/post comment rooms and their message history are preserved across every operation. For cross-L0 moves, 084's `SpaceMoveRoomsService.handleRoomsDuringMove()` preserves comment rooms but recreates the updates room and revokes room memberships for removed actors.

## Rooms Impact (cross-L0 specific, via 084)

| Room Type | L1→L1 cross-L0 | L1→L2 cross-L0 |
|---|---|---|
| Callout/post comment rooms | **Preserved** (messages intact) | **Preserved** |
| Updates room | **Recreated** (old deleted, new created) | **Recreated** |
| Room memberships | **Revoked** for all removed actors | **Revoked** for all removed actors |

## Cross-L0 Specific Concerns

| Aspect | L1→L1 cross-L0 | L1→L2 cross-L0 |
|---|---|---|
| **Level** | Unchanged (L1) | Demoted (L1→L2) |
| **levelZeroSpaceID** | Updated for entire subtree | Updated (single space, no descendants) |
| **Descendants** | L2 children move with parent | **Blocked** if L2 children exist (depth overflow) |
| **Account/License** | Inherited via new levelZeroSpaceID; license propagated | Same |
| **nameID** | Validated against target L0 scope | Same |
| **Storage aggregator** | Re-parented to target L0 | Re-parented to target L1 |
| **Authorization** | Rebuilt from target L0 | Rebuilt from target L1 |
| **Rooms (084)** | Fire-and-forget post-commit | Same |

## Same-L0 vs Cross-L0: Why Admins Differ

| Aspect | Same-L0 L1→L2 | Cross-L0 L1→L2 |
|---|---|---|
| Community hierarchy | Same L0 chain — admins hold valid credentials | Different L0 chain — admin credentials reference source L0, meaningless in target |
| Admin handling | Preserved (remove + re-add for credential reset) | **Cleared** — no preservation possible |
| Rationale | Admins are still members of the L0 community | Admins are sub-community of source L0; target L0 community is unrelated |
