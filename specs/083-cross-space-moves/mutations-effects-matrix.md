# Cross-Space Move Mutations — Effects Matrix

**Specs**: 083-cross-space-moves, 084-move-room-handling
**Date**: 2026-04-02

## New Mutations Overview

| Mutation | Direction | Scope |
|---|---|---|
| `moveSpaceL1ToSpaceL0` | L1 → L1 (lateral move) | Cross-L0 |
| `moveSpaceL1ToSpaceL2` | L1 → L2 (move + demote) | Cross-L0 |

## Full Effects Matrix

| Effect | `moveSpaceL1ToSpaceL0` (L1→L1 cross-L0) | `moveSpaceL1ToSpaceL2` (L1→L2 cross-L0) |
|---|---|---|
| **Space Level** | Unchanged (stays L1) | Demoted (L1 → L2) |
| **Parent** | Re-parented to target L0 | Re-parented to target L1 |
| **levelZeroSpaceID** | Updated for moved space + entire L2 subtree | Updated for moved space only (no descendants — blocked if L2 children exist) |
| **Descendants** | All L2 children move with parent | **Blocked** if source has L2 children (depth overflow) |
| **Members** | **REMOVED** | **REMOVED** |
| **Leads** | **REMOVED** | **REMOVED** |
| **Admins** | **REMOVED** | **REMOVED** |
| **Organizations** | **REMOVED** | **REMOVED** |
| **Virtual Contributors** | **REMOVED** | **REMOVED** |
| **Callout discussion rooms** | **Preserved** (full message history intact) | **Preserved** |
| **Post comment rooms** | **Preserved** | **Preserved** |
| **Updates room** | **Recreated** empty (old deleted) | **Recreated** empty |
| **Room memberships** | **Revoked** for all removed actors (fire-and-forget) | **Revoked** for all removed actors |
| **Callouts & contributions** | Kept | Kept |
| **Innovation flow tagsets** | **Synced** per space's own template (valid states preserved; invalid → default) | **Synced** per space's own template (valid states preserved; invalid → default) |
| **Authorization chain** | Rebuilt from target L0 | Rebuilt from target L1 |
| **Account / License** | Inherited from target L0; license propagated to subtree | Same |
| **Storage aggregator** | Re-parented to target L0's aggregator | Re-parented to target L1's aggregator |
| **Sort order** | Set to 0 (first) in target; siblings shift +1 | Set to 0 (first) in target; siblings shift +1 |
| **URL caches** | **Revoked** (L0 prefix changes) | **Revoked** |
| **NameID validation** | Entire moved subtree checked against target L0 scope | Source space only checked (no descendants) |
| **Visibility / privacy** | Preserved as-is | Preserved as-is |
| **Auto-invite (optional)** | Old L1 members ∩ target L0 members → invitations | Same overlap-set logic |
| **Auth required** | Platform Admin | Platform Admin |
| **Atomicity** | Single DB transaction; rooms + cache are post-commit best-effort | Same |

## Comparison: Same-L0 vs Cross-L0 Demotion

| Aspect | Same-L0 `convertSpaceL1ToSpaceL2` | Cross-L0 `moveSpaceL1ToSpaceL2` |
|---|---|---|
| Admins | **Preserved** (re-added with new credentials) | **REMOVED** |
| levelZeroSpaceID | Unchanged | Updated to target L0 |
| Innovation flow | Inherited (same L0) | Synced per space's own template (valid preserved; invalid → default) |
| Room handling (084) | None needed | Fire-and-forget post-commit |
| URL caches | No change | Revoked |
| NameID validation | Not needed (same scope) | Required (new scope) |
| Account context | Unchanged | Inherited from target L0 |

**Key insight**: The boundary is **same-L0 vs cross-L0**, not the level change direction. Any operation crossing L0 boundaries clears ALL roles because community memberships are hierarchical under the L0. Admin credentials rooted in the source L0's chain are meaningless in the target L0's context.
