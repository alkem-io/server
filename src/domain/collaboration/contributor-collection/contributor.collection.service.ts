import { ContributorType } from '@common/enums/contributor.type';
import { RoleName } from '@common/enums/role.name';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Community } from '@domain/community/community/community.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { EntityManager, In } from 'typeorm';
import { ICalloutContributorsSettings } from '../callout-settings/callout.settings.contributors.interface';
import { IContributorCollectionCounts } from './dto/contributor.collection.counts';
import { IContributorCollectionItem } from './dto/contributor.collection.item';
import { IContributorLocation } from './dto/contributor.location';

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
   * leads/admins first (FR-009). The same id appearing under multiple roles
   * keeps its highest rank / most senior role label.
   */
  private async getRankedIdsForType(
    roleSet: IRoleSet,
    type: ContributorType
  ): Promise<RankedContributorId[]> {
    // Rank: ADMIN (3) > LEAD (2) > MEMBER (1). The role label uses the most
    // senior role the contributor holds.
    const roleRanks: { role: RoleName; rank: number; label: string }[] = [
      { role: RoleName.ADMIN, rank: 3, label: 'admin' },
      { role: RoleName.LEAD, rank: 2, label: 'lead' },
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
    type: ContributorType,
    role: RoleName
  ): Promise<string[]> {
    switch (type) {
      case ContributorType.USER: {
        const users = await this.roleSetService.getUsersWithRole(roleSet, role);
        return users.map(u => u.id);
      }
      case ContributorType.ORGANIZATION: {
        const orgs = await this.roleSetService.getOrganizationsWithRole(
          roleSet,
          role
        );
        return orgs.map(o => o.id);
      }
      case ContributorType.VIRTUAL_CONTRIBUTOR: {
        const vcs = await this.roleSetService.getVirtualContributorsWithRole(
          roleSet,
          role
        );
        return vcs.map(v => v.id);
      }
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

  private getAvatarUrl(profile?: IProfile): string | undefined {
    return profile?.visuals?.find(v => v.name === VisualType.AVATAR)?.uri;
  }

  private buildLocation(
    type: ContributorType,
    profile?: IProfile
  ): IContributorLocation | undefined {
    // VCs have no location (FR-010); the client hides the map control for them.
    if (type === ContributorType.VIRTUAL_CONTRIBUTOR) {
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
    type: ContributorType,
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

    if (type === ContributorType.USER) {
      const hide = await this.shouldHideMemberUsers(
        space,
        roleSet,
        actorContext
      );
      if (hide) {
        return [];
      }
    }

    const ranked = await this.getRankedIdsForType(roleSet, type);
    const profilesById = await this.loadProfilesById(ranked.map(r => r.id));

    const items: (IContributorCollectionItem & { rank: number })[] = [];
    for (const entry of ranked) {
      const loaded = profilesById.get(entry.id);
      const profile = loaded?.profile;
      const url = profile
        ? await this.safeGenerateUrl(type, profile, loaded?.nameID)
        : undefined;
      items.push({
        id: entry.id,
        type,
        displayName: profile?.displayName ?? '',
        avatarUrl: this.getAvatarUrl(profile),
        roleLabel: entry.roleLabel,
        url,
        location: this.buildLocation(type, profile),
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
    type: ContributorType,
    profile: IProfile,
    nameID?: string
  ): Promise<string | undefined> {
    try {
      if (type === ContributorType.VIRTUAL_CONTRIBUTOR && nameID) {
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

    if (settings.contributorTypes.includes(ContributorType.USER)) {
      const hide = await this.shouldHideMemberUsers(
        space,
        roleSet,
        actorContext
      );
      if (!hide) {
        const ranked = await this.getRankedIdsForType(
          roleSet,
          ContributorType.USER
        );
        counts.users = ranked.length;
      }
    }
    if (settings.contributorTypes.includes(ContributorType.ORGANIZATION)) {
      const ranked = await this.getRankedIdsForType(
        roleSet,
        ContributorType.ORGANIZATION
      );
      counts.organizations = ranked.length;
    }
    if (
      settings.contributorTypes.includes(ContributorType.VIRTUAL_CONTRIBUTOR)
    ) {
      const ranked = await this.getRankedIdsForType(
        roleSet,
        ContributorType.VIRTUAL_CONTRIBUTOR
      );
      counts.virtualContributors = ranked.length;
    }
    return counts;
  }
}
