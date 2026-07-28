import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { orderSubspaces } from '@domain/space/space/subspace.ordering';
import { Injectable } from '@nestjs/common';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

/**
 * Computes the subspace collection for a SPACES callout
 * (workspace#013-spaces-collection-callout, US1/US2).
 *
 * Deliberately MUCH smaller than the contributors collection (008): a subspace
 * is already an `ISpace` (an `Actor` with `ActorType.SPACE`), so there is no new
 * item type, no counts, no config — the service just resolves the host space
 * from the callout and returns its direct subspaces, ordered pinned-first via
 * the shared `orderSubspaces` helper (the single ordering source, FR-007/R2).
 *
 * The returned `ISpace[]` is subject to the platform's existing subspace read
 * authorization: each `Space` returned is authorized per-field by the standard
 * space field-resolver auth (READ privilege) downstream — no new visibility
 * semantics are introduced here (FR-010). This matches the existing
 * `Space.subspaces` field, which likewise returns `getSubspaces` and relies on
 * per-space authorization for the fields the client selects.
 *
 * NOTE: like 008's collection service, this module intentionally does NOT import
 * SpaceModule (which would close a module cycle
 * CalloutFramingModule → SpaceCollectionModule → SpaceModule → … →
 * CalloutModule → CalloutFramingModule). The host space + subspaces are resolved
 * via the cycle-free CommunityResolverService (EntityResolverModule), and the
 * ordering is a pure helper shared with SpaceService.getSubspaces.
 */
@Injectable()
export class SpaceCollectionService {
  constructor(
    private readonly communityResolverService: CommunityResolverService
  ) {}

  /**
   * The host space's direct subspaces for a SPACES callout, ordered
   * pinned-first then sortOrder then displayName. Host-space-generic (works on
   * L0 or L1). Empty when the callout is not attached to a space (template /
   * knowledge base) or the host has no subspaces.
   */
  public async getSubspaces(callout: ICallout): Promise<ISpace[]> {
    const hostSpace =
      await this.communityResolverService.getSpaceWithSubspacesFromCollaborationCallout(
        callout.id
      );
    if (!hostSpace || !hostSpace.subspaces) {
      return [];
    }

    // Apply pinned-first, then sortOrder ordering (FR-010).
    const ordered = orderSubspaces(hostSpace.subspaces);

    // CUSTOM-mode intersection: apply the stored selectedIds as a FINAL
    // Set.has filter AFTER ordering (shrink-only, FR-007). AUTO returns the
    // full ordered list. The intersection IS the host-membership re-check
    // (a persisted foreign id can never appear in hostSpace.subspaces —
    // FR-008 stale-id inertness is free).
    const selectionMode =
      callout.settings?.framing?.selection?.mode ?? CalloutSelectionMode.AUTO;

    if (selectionMode === CalloutSelectionMode.CUSTOM) {
      const selectedIds = new Set(
        callout.settings?.framing?.selection?.selectedIds ?? []
      );
      return ordered.filter(s => selectedIds.has(s.id));
    }

    return ordered;
  }
}
