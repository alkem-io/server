import { LogContext } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialType } from '@common/enums/credential.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { organizationRoleDefinitions } from '@domain/community/organization/definitions/organization.role.definitions';
import { Organization } from '@domain/community/organization/organization.entity';
import { Space } from '@domain/space/space/space.entity';
import { spaceCommunityRoles } from '@domain/space/space.defaults/definitions/space.community.roles';
import { subspaceCommunityRoles } from '@domain/space/space.defaults/definitions/subspace.community.roles';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { RoleSet } from './role.set.entity';
import { RoleSetCacheService } from './role.set.service.cache';

const credentialTypesOf = (...definitions: CreateRoleInput[][]): string[] =>
  definitions.flat().map(roleDefinition => roleDefinition.credentialData.type);

/**
 * Space credentials whose resourceID is the Space owning the role set.
 *
 * Read from the shipped role definitions rather than restated here, for the
 * same reason the platform branch below reads the stored role definitions: a
 * role added to either level would otherwise need a second, easily forgotten
 * edit, and a missing entry silently reinstates the multi-hour stale-`myRoles`
 * window this service exists to close.
 *
 * The two implicit credentials have no Role row, so they cannot come from the
 * definitions and are listed explicitly. Neither backs a cached value today —
 * `actorRoles` iterates Role rows, and `membershipStatus` derives
 * INVITATION_PENDING from the Invitation row, not from the invitee credential —
 * so their invalidation is precautionary rather than load-bearing.
 */
const SPACE_ROLE_CREDENTIAL_TYPES = new Set<string>([
  ...credentialTypesOf(spaceCommunityRoles, subspaceCommunityRoles),
  AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
  AuthorizationCredential.SPACE_MEMBER_INVITEE,
]);

/** Organization credentials whose resourceID is the Organization. */
const ORGANIZATION_ROLE_CREDENTIAL_TYPES = new Set<string>(
  credentialTypesOf(organizationRoleDefinitions)
);

/**
 * Drops the cached membership state that a credential grant/revoke made stale.
 *
 * The role-set caches (`actorRoles`, `isMember`, `membershipStatus`) are read
 * before any credential is consulted, so a credential written straight through
 * `ActorService` — bypassing `RoleSetService.assignActorToRole` /
 * `removeActorFromRole`, which maintain these keys themselves — leaves the
 * cache answering with the pre-change roles until the membership TTL expires.
 */
@Injectable()
export class RoleSetCacheInvalidationService {
  constructor(
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    private readonly roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Invalidate the role set the credential belongs to, if any.
   *
   * Best-effort by design: the credential write is the source of truth and has
   * already happened, so a failure here is logged and never propagated to the
   * caller — cache TTL expiry is the fallback.
   */
  public async invalidateForCredentialChange(
    actorID: string,
    credentialType: CredentialType,
    resourceID?: string
  ): Promise<void> {
    try {
      const roleSetID = await this.resolveRoleSetID(credentialType, resourceID);
      if (!roleSetID) {
        return;
      }
      await this.roleSetCacheService.cleanActorMembershipCache(
        actorID,
        roleSetID
      );
    } catch (error) {
      this.logger.warn?.(
        `RoleSet cache invalidation failed for actor ${actorID} on credential ${credentialType}: ${error}`,
        LogContext.COMMUNITY
      );
    }
  }

  /**
   * The role set a credential grants a role in: the resource's own role set for
   * space and organization credentials, otherwise the platform role set when it
   * defines a role backed by this credential type.
   */
  private async resolveRoleSetID(
    credentialType: CredentialType,
    resourceID?: string
  ): Promise<string | undefined> {
    if (SPACE_ROLE_CREDENTIAL_TYPES.has(credentialType)) {
      if (!resourceID) {
        return undefined;
      }
      const space = await this.entityManager.findOne(Space, {
        where: { id: resourceID },
        relations: { community: { roleSet: true } },
      });
      return space?.community?.roleSet?.id;
    }

    if (ORGANIZATION_ROLE_CREDENTIAL_TYPES.has(credentialType)) {
      if (!resourceID) {
        return undefined;
      }
      const organization = await this.entityManager.findOne(Organization, {
        where: { id: resourceID },
        relations: { roleSet: true },
      });
      return organization?.roleSet?.id;
    }

    // Every platform role is declared with an empty resourceID, so a credential
    // that carries one — licensing, user-group, account-admin — can never back
    // a platform role. Bailing out here keeps those grants off a `role_set`
    // scan (the `type` column is not indexed) that would always come back with
    // no match.
    if (resourceID) {
      return undefined;
    }

    // Platform role credentials carry no resourceID, and the platform role set
    // is the only one of its type. Matching against its role definitions keeps
    // this in step with whichever credentials those roles are declared with,
    // rather than repeating the list here.
    const platformRoleSet = await this.entityManager.findOne(RoleSet, {
      where: { type: RoleSetType.PLATFORM },
      relations: { roles: true },
    });
    const definesRole = platformRoleSet?.roles?.some(
      role => role.credential.type === credentialType
    );
    return definesRole ? platformRoleSet?.id : undefined;
  }
}
