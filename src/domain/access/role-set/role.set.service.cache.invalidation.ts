import { LogContext } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialType } from '@common/enums/credential.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { Organization } from '@domain/community/organization/organization.entity';
import { Space } from '@domain/space/space/space.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { RoleSet } from './role.set.entity';
import { RoleSetCacheService } from './role.set.service.cache';

/**
 * Space credentials whose resourceID is the Space owning the role set. The
 * implicit ones (subspace-admin, invitee) have no Role row of their own but
 * still change what the cached membership state should say.
 */
const SPACE_ROLE_CREDENTIAL_TYPES: CredentialType[] = [
  AuthorizationCredential.SPACE_MEMBER,
  AuthorizationCredential.SPACE_ADMIN,
  AuthorizationCredential.SPACE_LEAD,
  AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
  AuthorizationCredential.SPACE_MEMBER_INVITEE,
];

/** Organization credentials whose resourceID is the Organization. */
const ORGANIZATION_ROLE_CREDENTIAL_TYPES: CredentialType[] = [
  AuthorizationCredential.ORGANIZATION_ASSOCIATE,
  AuthorizationCredential.ORGANIZATION_ADMIN,
  AuthorizationCredential.ORGANIZATION_OWNER,
];

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
    if (SPACE_ROLE_CREDENTIAL_TYPES.includes(credentialType)) {
      if (!resourceID) {
        return undefined;
      }
      const space = await this.entityManager.findOne(Space, {
        where: { id: resourceID },
        relations: { community: { roleSet: true } },
      });
      return space?.community?.roleSet?.id;
    }

    if (ORGANIZATION_ROLE_CREDENTIAL_TYPES.includes(credentialType)) {
      if (!resourceID) {
        return undefined;
      }
      const organization = await this.entityManager.findOne(Organization, {
        where: { id: resourceID },
        relations: { roleSet: true },
      });
      return organization?.roleSet?.id;
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
