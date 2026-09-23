import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { RoleName } from '@common/enums/role.name';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Community } from '@domain/community/community/community.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { Organization } from '@domain/community/organization/organization.entity';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { EntityManager, In } from 'typeorm';
import { ICalloutContributorsSettings } from '../callout-settings/callout.settings.contributors.interface';
import {
  normalizeTagline,
  normalizeWebsite,
  pickContributorTags,
  truncateToMonthUtc,
} from './contributor.card.enrichment';
import { IContributorCollectionCounts } from './dto/contributor.collection.counts';
import { IContributorCollectionItem } from './dto/contributor.collection.item';
import { IContributorLocation } from './dto/contributor.location';

// Tagset names read for the tags-preference-order enrichment, per contributor
// type (data-model.md §1). One narrow read covers whichever names the type
// needs; unrelated tagsets (default, flow-state, task, …) are never fetched.
const TAGSET_NAMES_BY_TYPE: Partial<Record<ActorType, TagsetReservedName[]>> = {
  [ActorType.USER]: [TagsetReservedName.SKILLS, TagsetReservedName.KEYWORDS],
  [ActorType.ORGANIZATION]: [
    TagsetReservedName.KEYWORDS,
    TagsetReservedName.CAPABILITIES,
  ],
  [ActorType.VIRTUAL_CONTRIBUTOR]: [
    TagsetReservedName.KEYWORDS,
    TagsetReservedName.CAPABILITIES,
  ],
};

// A contributor row, decorated with the role label and a leads-first sort flag.
type RankedContributorId = {
  id: string;
  // Higher rank sorts first (leads/admins before plain members).
  rank: number;
  roleLabel: string;
};

@Injectable()
export class ContributorCollectionService {
  constructor(
    private readonly roleSetService: RoleSetService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly urlGeneratorService: UrlGeneratorService,
    @InjectEntityManager() private readonly entityManager: EntityManager
  ) {}

  /**
   * Resolve a CONTRIBUTORS callout's framing settings.
   */
  private getSettings(
    callout: ICallout
  ): ICalloutContributorsSettings | undefined {
    return callout.settings?.framing?.contributors;
  }

  /**
   * Read-time defaulting for the selection block (FR-016):
   * absent / null ⇒ {AUTO, []} — defensive, covers rows the migration
   * never saw and the deploy-to-migrate window.
   */
  private getSelectionMode(callout: ICallout): CalloutSelectionMode {
    return (
      callout.settings?.framing?.selection?.mode ?? CalloutSelectionMode.AUTO
    );
  }

  private getSelectedIds(callout: ICallout): Set<string> {
    const ids = callout.settings?.framing?.selection?.selectedIds ?? [];
    return new Set(ids);
  }

  /**
   * Resolve callout → Community (with RoleSet) → Space (with settings) for a
   * collaboration callout. Returns undefined when the callout is not attached
   * to a space (e.g. template / knowledge base).
   */
  private async resolveContext(callout: ICallout): Promise<
    | {
        roleSet: IRoleSet;
        space: Space;
      }
    | undefined
  > {
    let community: ICommunity;
    try {
      community =
        await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
          callout.id
        );
    } catch (error) {
      // Only the "callout is not attached to a space" case is expected here
      // (template / knowledge-base callouts) → treat as "no collection".
      // Re-throw everything else so real resolver/DB failures surface.
      if (error instanceof EntityNotFoundException) {
        return undefined;
      }
      throw error;
    }

    // Load the community's RoleSet directly (avoids importing CommunityModule,
    // which would close a module cycle — see contributor.collection.module.ts).
    const communityWithRoleSet = await this.entityManager.findOne(Community, {
      where: { id: community.id },
      relations: { roleSet: true },
    });
    const roleSet = communityWithRoleSet?.roleSet;
    if (!roleSet) {
      return undefined;
    }
    const space = await this.entityManager.findOne(Space, {
      where: { community: { id: community.id } },
    });
    if (!space) {
      return undefined;
    }
    return { roleSet, space };
  }

  /**
   * Whether member USERS should be hidden from this viewer because the space's
   * user-information visibility is "members only" and the viewer is not a
   * member (FR-015/FR-017). Organizations and VCs are unaffected.
   */
  private async shouldHideMemberUsers(
    space: Space,
    roleSet: IRoleSet,
    actorContext: ActorContext
  ): Promise<boolean> {
    const visibility =
      space.settings?.privacy?.userInformationVisibility ??
      UserInformationVisibility.FOLLOW_SPACE_VISIBILITY;
    if (visibility !== UserInformationVisibility.MEMBERS_ONLY) {
      return false;
    }
    if (!actorContext.actorID) {
      // Anonymous viewer is never a member.
      return true;
    }
    const isMember = await this.roleSetService.isMember(
      actorContext.actorID,
      roleSet
    );
    return !isMember;
  }

  /**
   * Build the ranked, deduplicated set of contributor IDs for a given type,
   * leads first (FR-009). The same id appearing under multiple roles keeps its
   * highest rank / most senior role label.
   */
  private async getRankedIdsForType(
    roleSet: IRoleSet,
    type: ActorType
  ): Promise<RankedContributorId[]> {
    // Only LEAD and MEMBER are surfaced as display roles: a contributor holding
    // the LEAD role is shown (and sorted) as a lead; everyone else — including
    // admins who are NOT leads — is a plain member. ADMIN is still fetched so an
    // admin who isn't separately in the member role is still included, but it
    // never yields an "admin" label and never outranks LEAD (so a lead who is
    // also an admin stays a lead, not a member).
    const roleRanks: { role: RoleName; rank: number; label: string }[] = [
      { role: RoleName.LEAD, rank: 2, label: 'lead' },
      { role: RoleName.ADMIN, rank: 1, label: 'member' },
      { role: RoleName.MEMBER, rank: 1, label: 'member' },
    ];

    const byId = new Map<string, RankedContributorId>();
    for (const { role, rank, label } of roleRanks) {
      const ids = await this.getContributorIdsInRole(roleSet, type, role);
      for (const id of ids) {
        const existing = byId.get(id);
        if (!existing || rank > existing.rank) {
          byId.set(id, { id, rank, roleLabel: label });
        }
      }
    }
    return [...byId.values()];
  }

  private async getContributorIdsInRole(
    roleSet: IRoleSet,
    type: ActorType,
    role: RoleName
  ): Promise<string[]> {
    switch (type) {
      case ActorType.USER: {
        const users = await this.roleSetService.getUsersWithRole(roleSet, role);
        return users.map(u => u.id);
      }
      case ActorType.ORGANIZATION: {
        const orgs = await this.roleSetService.getOrganizationsWithRole(
          roleSet,
          role
        );
        return orgs.map(o => o.id);
      }
      case ActorType.VIRTUAL_CONTRIBUTOR: {
        const vcs = await this.roleSetService.getVirtualContributorsWithRole(
          roleSet,
          role
        );
        return vcs.map(v => v.id);
      }
      // ActorType also has SPACE / ACCOUNT / VIRTUAL_ASSISTANT, which are not
      // community contributors (CONTRIBUTOR_ACTOR_TYPES) — never returned here.
      default:
        return [];
    }
  }

  /**
   * Load the actor profiles for a set of ids, keyed by id. Reads from the
   * `actor` (CTI) table directly so all three contributor types are covered in
   * one query, pulling the profile, its location, and its visuals.
   */
  private async loadProfilesById(
    ids: string[]
  ): Promise<Map<string, { nameID: string; profile?: IProfile }>> {
    const result = new Map<string, { nameID: string; profile?: IProfile }>();
    if (ids.length === 0) {
      return result;
    }
    // Read from the `actor` (CTI) entity so all three contributor types are
    // covered in one query. Use the entity class + `relations` (not a raw
    // string-table query builder) so TypeORM hydrates the profile graph
    // reliably — `getMany()` over a string-table root does not populate the
    // mapped joins. `profile` is a real @OneToOne on NameableEntity.
    const actors = await this.entityManager.find(Actor, {
      where: { id: In(ids) },
      relations: { profile: { location: true, visuals: true } },
    });

    for (const actor of actors) {
      result.set(actor.id, {
        nameID: actor.nameID,
        profile: actor.profile as unknown as IProfile,
      });
    }
    return result;
  }

  /**
   * Load the profile-scoped tagsets used by the tags enrichment, keyed by
   * profile id — one narrow read per contributor type, restricted to the
   * pair of tagset names that type's preference order can select from.
   * Deliberately separate from `loadProfilesById` (spec D-TAGQ): joining
   * tagsets into that read alongside `visuals` would multiply the wide
   * profile rows (two one-to-many relations on the same root).
   */
  private async loadTagsetsByProfileId(
    profileIds: string[],
    type: ActorType
  ): Promise<Map<string, ITagset[]>> {
    const result = new Map<string, ITagset[]>();
    if (profileIds.length === 0) {
      return result;
    }
    const names = TAGSET_NAMES_BY_TYPE[type];
    if (!names) {
      return result;
    }
    const tagsets = await this.entityManager.find(Tagset, {
      where: { profile: { id: In(profileIds) }, name: In(names) },
      relations: { profile: true },
      select: {
        id: true,
        name: true,
        tags: true,
        profile: { id: true },
      },
    });
    for (const tagset of tagsets) {
      const profileId = tagset.profile?.id;
      if (!profileId) {
        continue;
      }
      const existing = result.get(profileId);
      if (existing) {
        existing.push(tagset);
      } else {
        result.set(profileId, [tagset]);
      }
    }
    return result;
  }

  /**
   * Narrow read of the organization website column for the given
   * organization ids, keyed by id. Users and Virtual Contributors never call
   * this — `website` is undefined for them without any read.
   */
  private async loadOrganizationWebsites(
    organizationIds: string[]
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (organizationIds.length === 0) {
      return result;
    }
    const organizations = await this.entityManager.find(Organization, {
      where: { id: In(organizationIds) },
      select: { id: true, website: true },
    });
    for (const organization of organizations) {
      result.set(organization.id, organization.website);
    }
    return result;
  }

  /**
   * Count the distinct USER actors holding the organization-associate
   * credential, per organization id — the same semantic as
   * `Organization.metrics`' "associates" value, batched. An organization
   * absent from the result gets 0 (not undefined). Deliberately NOT
   * `CredentialService.countMatchingCredentialsBatch`: that helper ignores
   * the actor type and groups on `resourceID` alone, so a stray non-user
   * associate row (or one with a null actor) would inflate the count here.
   */
  private async countAssociatesByOrganizationId(
    organizationIds: string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (organizationIds.length === 0) {
      return result;
    }
    const rows = await this.entityManager
      .createQueryBuilder(Credential, 'credential')
      .innerJoin('credential.actor', 'actor')
      .select('credential.resourceID', 'resourceID')
      .addSelect('COUNT(DISTINCT credential.actorId)', 'count')
      .where('credential.type = :type', {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      })
      .andWhere('credential.resourceID IN (:...organizationIds)', {
        organizationIds,
      })
      .andWhere('actor.type = :actorType', { actorType: ActorType.USER })
      .groupBy('credential.resourceID')
      .getRawMany<{ resourceID: string; count: string }>();

    for (const row of rows) {
      result.set(row.resourceID, Number(row.count));
    }
    return result;
  }

  /**
   * The earliest member-credential `createdDate` per USER actor id, for the
   * callout's own role set — never a hard-coded `'space-member'` string, so
   * an L1/L2 callout reports the subspace's own membership. An id absent
   * from the result holds no member credential there (e.g. admin-only).
   */
  private async loadJoinedDatesByActorId(
    roleSet: IRoleSet,
    actorIds: string[]
  ): Promise<Map<string, Date>> {
    const result = new Map<string, Date>();
    if (actorIds.length === 0) {
      return result;
    }
    const membershipCredential =
      await this.roleSetService.getCredentialDefinitionForRole(
        roleSet,
        RoleName.MEMBER
      );
    const rows = await this.entityManager
      .createQueryBuilder(Credential, 'credential')
      .select('credential.actorId', 'actorId')
      .addSelect('MIN(credential.createdDate)', 'minCreatedDate')
      .where('credential.type = :type', { type: membershipCredential.type })
      .andWhere('credential.resourceID = :resourceID', {
        resourceID: membershipCredential.resourceID,
      })
      .andWhere('credential.actorId IN (:...actorIds)', { actorIds })
      .groupBy('credential.actorId')
      .getRawMany<{ actorId: string; minCreatedDate: string }>();

    for (const row of rows) {
      result.set(row.actorId, new Date(row.minCreatedDate));
    }
    return result;
  }

  private getAvatarUrl(profile?: IProfile): string | undefined {
    return profile?.visuals?.find(v => v.name === VisualType.AVATAR)?.uri;
  }

  private buildLocation(
    type: ActorType,
    profile?: IProfile
  ): IContributorLocation | undefined {
    // VCs have no location (FR-010); the client hides the map control for them.
    if (type === ActorType.VIRTUAL_CONTRIBUTOR) {
      return undefined;
    }
    const location = profile?.location;
    if (!location) {
      return undefined;
    }
    const geo = location.geoLocation;
    return {
      city: location.city,
      country: location.country,
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      hasValidCoordinates: geo?.isValid === true,
    };
  }

  /**
   * Compute the full, authorized, ordered set of contributor cards for one
   * active type (FR-008/FR-009/FR-012a/FR-012b). The server returns the entire
   * set; the client paginates / name-searches client-side.
   *
   * Enforces:
   * - the callout's `contributorTypes` selection (FR-007) — a deselected type
   *   yields an empty set;
   * - the space user-information visibility setting (FR-015/FR-017) — member
   *   USERS are excluded for non-members when "members only".
   */
  public async getContributors(
    callout: ICallout,
    type: ActorType,
    actorContext: ActorContext
  ): Promise<IContributorCollectionItem[]> {
    const settings = this.getSettings(callout);
    if (!settings || !settings.contributorTypes.includes(type)) {
      return [];
    }
    const context = await this.resolveContext(callout);
    if (!context) {
      return [];
    }
    const { roleSet, space } = context;

    if (type === ActorType.USER) {
      const hide = await this.shouldHideMemberUsers(
        space,
        roleSet,
        actorContext
      );
      if (hide) {
        return [];
      }
    }

    let ranked = await this.getRankedIdsForType(roleSet, type);

    // CUSTOM-mode intersection: apply the stored selectedIds as a FINAL Set.has
    // filter AFTER the eligibility + visibility pipeline (FR-007 shrink-only).
    // AUTO skips the filter entirely. Ordering code is untouched (FR-010).
    if (this.getSelectionMode(callout) === CalloutSelectionMode.CUSTOM) {
      const selectedIds = this.getSelectedIds(callout);
      ranked = ranked.filter(r => selectedIds.has(r.id));
    }

    const profilesById = await this.loadProfilesById(ranked.map(r => r.id));

    // Enrichment reads (constant in contributor count, FR-031): one narrow
    // tagset read for every type; website + associates reads only for
    // ORGANIZATION; the joined-date read only for USER. Each helper
    // short-circuits to an empty map — and issues no read — for an empty id
    // list, so the wrong-type branches below cost nothing.
    const profileIds = [...profilesById.values()]
      .map(loaded => loaded.profile?.id)
      .filter((id): id is string => !!id);
    const tagsetsByProfileId = await this.loadTagsetsByProfileId(
      profileIds,
      type
    );

    const organizationIds =
      type === ActorType.ORGANIZATION ? ranked.map(r => r.id) : [];
    const websitesByOrganizationId =
      await this.loadOrganizationWebsites(organizationIds);
    const associatesCountByOrganizationId =
      await this.countAssociatesByOrganizationId(organizationIds);

    const userIds = type === ActorType.USER ? ranked.map(r => r.id) : [];
    const joinedDatesByActorId = await this.loadJoinedDatesByActorId(
      roleSet,
      userIds
    );

    const items: (IContributorCollectionItem & { rank: number })[] = [];
    for (const entry of ranked) {
      const loaded = profilesById.get(entry.id);
      const profile = loaded?.profile;
      const url = profile
        ? await this.safeGenerateUrl(type, profile, loaded?.nameID)
        : undefined;
      const profileTagsets = profile?.id
        ? (tagsetsByProfileId.get(profile.id) ?? [])
        : [];
      const joinedDate =
        type === ActorType.USER
          ? joinedDatesByActorId.get(entry.id)
          : undefined;
      items.push({
        id: entry.id,
        type,
        displayName: profile?.displayName ?? '',
        avatarUrl: this.getAvatarUrl(profile),
        roleLabel: entry.roleLabel,
        url,
        location: this.buildLocation(type, profile),
        tagline: normalizeTagline(profile?.tagline),
        tags: pickContributorTags(type, profileTagsets),
        joinedDate: joinedDate ? truncateToMonthUtc(joinedDate) : undefined,
        website:
          type === ActorType.ORGANIZATION
            ? normalizeWebsite(websitesByOrganizationId.get(entry.id))
            : undefined,
        associatesCount:
          type === ActorType.ORGANIZATION
            ? (associatesCountByOrganizationId.get(entry.id) ?? 0)
            : undefined,
        rank: entry.rank,
      });
    }

    // Order: leads/admins first (higher rank), then alphabetical by displayName
    // (case-insensitive), mirroring the existing community block (FR-009).
    items.sort((a, b) => {
      if (b.rank !== a.rank) {
        return b.rank - a.rank;
      }
      return a.displayName.localeCompare(b.displayName, undefined, {
        sensitivity: 'base',
      });
    });

    return items.map(({ rank: _rank, ...item }) => item);
  }

  private async safeGenerateUrl(
    type: ActorType,
    profile: IProfile,
    nameID?: string
  ): Promise<string | undefined> {
    try {
      if (type === ActorType.VIRTUAL_CONTRIBUTOR && nameID) {
        return this.urlGeneratorService.generateUrlForVC(nameID);
      }
      return await this.urlGeneratorService.generateUrlForProfile(profile);
    } catch {
      return undefined;
    }
  }

  /**
   * Per-type counts of the total eligible set after type-selection and
   * user-information visibility filtering (FR-013/FR-014). A deselected type
   * counts as 0; member USERS are excluded for non-members when "members only".
   */
  public async getContributorCounts(
    callout: ICallout,
    actorContext: ActorContext
  ): Promise<IContributorCollectionCounts> {
    const counts: IContributorCollectionCounts = {
      users: 0,
      organizations: 0,
      virtualContributors: 0,
    };
    const settings = this.getSettings(callout);
    if (!settings) {
      return counts;
    }
    const context = await this.resolveContext(callout);
    if (!context) {
      return counts;
    }
    const { roleSet, space } = context;

    const selectionMode = this.getSelectionMode(callout);
    const selectedIds =
      selectionMode === CalloutSelectionMode.CUSTOM
        ? this.getSelectedIds(callout)
        : null; // null → AUTO, no filter

    const applySelectionFilter = (
      ranked: { id: string }[]
    ): { id: string }[] =>
      selectedIds !== null ? ranked.filter(r => selectedIds.has(r.id)) : ranked;

    if (settings.contributorTypes.includes(ActorType.USER)) {
      const hide = await this.shouldHideMemberUsers(
        space,
        roleSet,
        actorContext
      );
      if (!hide) {
        const ranked = await this.getRankedIdsForType(roleSet, ActorType.USER);
        counts.users = applySelectionFilter(ranked).length;
      }
    }
    if (settings.contributorTypes.includes(ActorType.ORGANIZATION)) {
      const ranked = await this.getRankedIdsForType(
        roleSet,
        ActorType.ORGANIZATION
      );
      counts.organizations = applySelectionFilter(ranked).length;
    }
    if (settings.contributorTypes.includes(ActorType.VIRTUAL_CONTRIBUTOR)) {
      const ranked = await this.getRankedIdsForType(
        roleSet,
        ActorType.VIRTUAL_CONTRIBUTOR
      );
      counts.virtualContributors = applySelectionFilter(ranked).length;
    }
    return counts;
  }
}
