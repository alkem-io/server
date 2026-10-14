import { AuthorizationPrivilege } from '@common/enums';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  ACCOUNT_SCOPED_SPACE_ALIAS,
  accountScopedSpaceQuery,
} from '@domain/space/space/account.scope';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { orderSubspaces } from '@domain/space/space/subspace.ordering';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityManager } from 'typeorm';

/** The CUSTOM branch's single pass: what the viewer may see, and whether
 * anything still in the account was withheld from them. A BOOLEAN, never a
 * count — workspace#084 FR-018 exposes no count and spec A1 rejected exposing
 * one, so the type states that decision rather than plumbing a number a later
 * contributor could surface. */
type ResolvedSelection = { spaces: ISpace[]; withheld: boolean };

/**
 * Computes the subspace collection for a SPACES callout
 * (workspace#013-spaces-collection-callout, US1/US2; CUSTOM selection widened
 * to the host space's ACCOUNT by workspace#084).
 *
 * Deliberately MUCH smaller than the contributors collection (008): a subspace
 * is already an `ISpace` (an `Actor` with `ActorType.SPACE`), so there is no new
 * item type, no counts, no config.
 *
 * ## AUTO: no list-level filtering, by design
 *
 * AUTO is the pre-084 code path, byte-identical in content AND in query count
 * (workspace#084 FR-006/SC-005): resolve the host space from the callout,
 * return its direct subspaces ordered pinned-first via the shared
 * `orderSubspaces` helper. Each `Space` returned is authorized per-field by the
 * standard space field-resolver auth downstream — no list-level filter and no
 * new visibility semantics (013 FR-010). This matches the existing
 * `Space.subspaces` field.
 *
 * AUTO is therefore still exposed to the nullification failure described below
 * (workspace#084 risk **R-F**), and that is a deliberate, recorded
 * out-of-scope decision rather than an oversight: reproducing it needs a viewer
 * who is denied READ_ABOUT on a DIRECT subspace of a space they can read,
 * which a host-space reader does not have on its own subspaces. Not
 * reproduced, not fixed here, follow-up ticket.
 *
 * ## CUSTOM: list-level filtering is mandatory
 *
 * A CUSTOM selection may name any space of the host's account at any level —
 * including a PRIVATE sibling L0 the viewer holds no role on. Those elements
 * cannot be left to per-field authorization: `ISpace.about` is a NON-NULL
 * `@Field` whose loader checks `READ_ABOUT` on the parent
 * (`findByBatchIds.ts`), so one unreadable element throws for the element,
 * nullifies it, and — because the collection is `[ISpace!]!` — nullifies the
 * WHOLE list for every viewer, the admin included (FR-017). So CUSTOM filters
 * at list level, after authorization, shrink-only.
 *
 * The privilege is **`READ`, not `READ_ABOUT`** (ruling D1). An L0 space's
 * About is readable by every actor including anonymous unless the space is
 * ARCHIVED — `getAccessPrivilegesFor*` push READ_ABOUT unconditionally for
 * level 0 and withhold only READ — so a READ_ABOUT filter would withhold
 * nothing and let a private sibling L0 through, whose card then nullifies the
 * collection. `READ` implies `READ_ABOUT`
 * (`space.service.authorization.ts`), so filtering on READ also removes
 * exactly the elements that would otherwise nullify the list.
 *
 * NOTE: like 008's collection service, this module intentionally does NOT import
 * SpaceModule (which would close a module cycle
 * CalloutFramingModule → SpaceCollectionModule → SpaceModule → … →
 * CalloutModule → CalloutFramingModule). The host space + subspaces are resolved
 * via the cycle-free CommunityResolverService (EntityResolverModule) and a
 * direct `EntityManager` (the pattern `ContributorCollectionService` uses), and
 * the ordering is a pure helper shared with SpaceService.getSubspaces.
 */
@Injectable()
export class SpaceCollectionService {
  constructor(
    private readonly communityResolverService: CommunityResolverService,
    private readonly authorizationService: AuthorizationService,
    @InjectEntityManager() private readonly entityManager: EntityManager
  ) {}

  /**
   * THE one owner of "which selection mode is this callout in" (FR-018b).
   * Both public methods call it; neither re-reads the setting. Two independent
   * reads can disagree on a pre-025 callout whose `selection` block is absent —
   * one defaulting to AUTO and the other entering the CUSTOM path — which
   * renders AUTO's full subspace list BESIDE a per-viewer withheld flag, green
   * against any spec that tests one method at a time.
   *
   * The rung cannot move inside `resolveSelection`: `getSubspaces`'s AUTO arm
   * must stay the pre-084 code path (FR-006/SC-005 — byte-identical content
   * and query count), so each public method keeps its own ternary over this
   * single fact. Same shape as `ContributorCollectionService.getSelectionMode`.
   */
  private getSelectionMode(callout: ICallout): CalloutSelectionMode {
    return (
      callout.settings?.framing?.selection?.mode ?? CalloutSelectionMode.AUTO
    );
  }

  /**
   * The spaces a SPACES callout's collection shows this viewer.
   *
   * AUTO: the host space's direct subspaces, ordered pinned-first then
   * sortOrder then displayName. Host-space-generic (works on L0 or L1). Empty
   * when the callout is not attached to a space (template / knowledge base) or
   * the host has no subspaces.
   *
   * CUSTOM: the stored selection, intersected with the host account and then
   * with what this viewer may READ. Unordered — see `resolveSelection`.
   */
  public async getSubspaces(
    callout: ICallout,
    actorContext: ActorContext
  ): Promise<ISpace[]> {
    if (this.getSelectionMode(callout) === CalloutSelectionMode.AUTO) {
      const hostSpace =
        await this.communityResolverService.getSpaceWithSubspacesFromCollaborationCallout(
          callout.id
        );
      if (!hostSpace || !hostSpace.subspaces) {
        return [];
      }

      // Apply pinned-first, then sortOrder ordering (013 FR-010).
      return orderSubspaces(hostSpace.subspaces);
    }

    return (await this.resolveSelection(callout, actorContext)).spaces;
  }

  /**
   * Whether this viewer's CUSTOM collection is missing a space that IS still in
   * the account but which they may not READ (workspace#084 FR-018, AC6).
   *
   * Derived from the SAME pass as `getSubspaces` — it re-checks nothing. Every
   * short-circuit (non-SPACES kind, empty selection, unresolved host) lives in
   * `resolveSelection` and is asserted once. Always `false` for AUTO, which is
   * why AUTO pays no extra query for this field.
   */
  public async hasHiddenSpaces(
    callout: ICallout,
    actorContext: ActorContext
  ): Promise<boolean> {
    return this.getSelectionMode(callout) === CalloutSelectionMode.AUTO
      ? false
      : (await this.resolveSelection(callout, actorContext)).withheld;
  }

  /**
   * The CUSTOM branch, and the ONLY place its short-circuit ladder is written.
   *
   * Returns the readable set UNORDERED. `orderSubspaces` is deliberately NOT
   * called (FR-019): `pinned`/`sortOrder` are parent-relative, so they are
   * meaningless across a cross-parent set, and the single consumer
   * re-partitions the whole list client-side anyway (`useSubspacesSorted`).
   */
  private async resolveSelection(
    callout: ICallout,
    actorContext: ActorContext
  ): Promise<ResolvedSelection> {
    // (a) Not a SPACES collection — answered with NO lookup of any kind. The
    // kind is `callout.framing.type` (the `framing` relation is eager, so it is
    // present on every callout loaded through `getCalloutOrFail`), NOT anything
    // inside `callout.settings.framing`, which carries no framing type at all.
    // Skip this rung and every render of a CONTRIBUTORS callout in CUSTOM mode
    // runs the account-scope SPACE query over CONTRIBUTOR ids.
    if (callout.framing?.type !== CalloutFramingType.SPACES) {
      return { spaces: [], withheld: false };
    }

    // (b) Nothing selected — zero queries, and BEFORE the host lookup, so an
    // empty CUSTOM selection (which 025 permits saving) costs nothing. Never
    // express this by dropping the shared predicate's id filter: its absent
    // form means THE WHOLE ACCOUNT (see `account.scope.ts`).
    const selectedIds = callout.settings?.framing?.selection?.selectedIds ?? [];
    if (selectedIds.length === 0) {
      return { spaces: [], withheld: false };
    }

    // (c) No host space (a template, or a knowledge-base-hosted callout) — no
    // ACCOUNT query. ONE light host lookup is unavoidable and expected:
    // `callout.calloutsSet` is NOT eager, so "has no host space" is not
    // knowable without asking. Do not replace it with a proxy such as
    // `isTemplate`, which answers correctly for templates and silently takes
    // the query path for a knowledge-base-hosted SPACES callout.
    // The id and NOTHING else — deliberately not AUTO's
    // `getSpaceWithSubspacesFromCollaborationCallout`, which eagerly loads the
    // host's subspaces and their About profiles, all of which CUSTOM discards.
    const hostSpace = await this.entityManager.findOne(Space, {
      where: {
        collaboration: { calloutsSet: { callouts: { id: callout.id } } },
      },
      select: { id: true },
    });
    if (!hostSpace) {
      return { spaces: [], withheld: false };
    }

    // ONE query, through the single account-scope predicate — never a
    // re-written join (FR-004a). WHOLE `space` rows — NO column restriction,
    // because one would nullify this `[ISpace!]!` list for every viewer
    // (FR-017; the rule and its failure mode live in `account.scope.ts`) —
    // plus `authorization` and NO other relation: no `about`, no profile, no
    // visuals. The exclusion this design wants is of RELATIONS, not COLUMNS.
    //
    // INNER, not LEFT. `isAccessGranted` THROWS when the policy is undefined,
    // and a left join yields `null` for a row whose `authorizationId` is null —
    // reachable, because that FK is ON DELETE SET NULL. Dropping that row in
    // SQL is shrink-only and needs no null check in the filter below.
    const rows = await accountScopedSpaceQuery(
      this.entityManager,
      hostSpace.id,
      selectedIds
    )
      .innerJoinAndSelect(
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.authorization`,
        'authorization'
      )
      .getMany();

    // Per-viewer READ filter (never READ_ABOUT — see the class doc), in
    // memory, zero queries. `withheld` counts only
    // rows that CAME BACK from the query — i.e. are still in the account — and
    // failed READ. Ids ABSENT from the result have LEFT the account: they are
    // stale and must not raise the flag (AC6 vs AC7).
    const spaces: ISpace[] = [];
    let withheld = false;
    for (const space of rows) {
      if (
        this.authorizationService.isAccessGranted(
          actorContext,
          space.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        spaces.push(space);
      } else {
        withheld = true;
      }
    }

    return { spaces, withheld };
  }
}
