import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Injectable } from '@nestjs/common';
import {
  SubjectMembershipsPayload,
  SubjectOrganizationMembership,
  SubjectSpaceMembership,
} from './dto/notification.payloads';

const SPACE_CREDENTIAL_ROLES: Record<string, 'admin' | 'lead' | 'member'> = {
  [AuthorizationCredential.SPACE_ADMIN]: 'admin',
  [AuthorizationCredential.SPACE_SUBSPACE_ADMIN]: 'admin',
  [AuthorizationCredential.SPACE_LEAD]: 'lead',
  [AuthorizationCredential.SPACE_MEMBER]: 'member',
};

const ORG_CREDENTIAL_ROLES: Record<string, string> = {
  [AuthorizationCredential.ORGANIZATION_OWNER]: 'owner',
  [AuthorizationCredential.ORGANIZATION_ADMIN]: 'admin',
  [AuthorizationCredential.ORGANIZATION_ASSOCIATE]: 'associate',
};

const GLOBAL_ROLE_CREDENTIAL_TYPES: ReadonlySet<string> = new Set([
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_COMMUNITY_READ,
  AuthorizationCredential.GLOBAL_SPACES_READER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
  AuthorizationCredential.GLOBAL_SUPPORT_MANAGER,
  AuthorizationCredential.BETA_TESTER,
  AuthorizationCredential.VC_CAMPAIGN,
]);

export interface SubjectFootprint extends SubjectMembershipsPayload {
  globalRoles: string[];
}

/**
 * Resolves the subject user's organisational footprint at call-time
 * (research.md §R8). Caller MUST NOT cache — the snapshot is intended to reflect
 * either commit-time state (COMMITTED audit row) or drift-detected-time state
 * (DRIFT_DETECTED audit row).
 */
@Injectable()
export class UserEmailChangeSubjectFootprintResolver {
  constructor(
    private readonly userLookupService: UserLookupService,
    private readonly spaceLookupService: SpaceLookupService
  ) {}

  public async buildSubjectFootprint(
    userId: string
  ): Promise<SubjectFootprint> {
    const { credentials } =
      await this.userLookupService.getUserAndCredentials(userId);

    const spacesById = new Map<string, SubjectSpaceMembership>();
    const orgsById = new Map<string, SubjectOrganizationMembership>();
    const globalRoles = new Set<string>();

    for (const credential of credentials) {
      const role = SPACE_CREDENTIAL_ROLES[credential.type];
      if (role && credential.resourceID) {
        const existing = spacesById.get(credential.resourceID) ?? {
          spaceId: credential.resourceID,
          level: '',
          roles: [],
        };
        if (!existing.roles.includes(role)) {
          existing.roles.push(role);
        }
        spacesById.set(credential.resourceID, existing);
        continue;
      }

      const orgRole = ORG_CREDENTIAL_ROLES[credential.type];
      if (orgRole && credential.resourceID) {
        const existing = orgsById.get(credential.resourceID) ?? {
          organizationId: credential.resourceID,
          roles: [],
        };
        if (!existing.roles.includes(orgRole)) {
          existing.roles.push(orgRole);
        }
        orgsById.set(credential.resourceID, existing);
        continue;
      }

      if (GLOBAL_ROLE_CREDENTIAL_TYPES.has(credential.type)) {
        globalRoles.add(credential.type);
      }
    }

    await this.hydrateSpaceLevels(spacesById);

    return {
      spaces: Array.from(spacesById.values()),
      organizations: Array.from(orgsById.values()),
      globalRoles: Array.from(globalRoles.values()),
    };
  }

  private async hydrateSpaceLevels(
    spacesById: Map<string, SubjectSpaceMembership>
  ): Promise<void> {
    if (spacesById.size === 0) return;
    const ids = Array.from(spacesById.keys());
    const spaces = await this.spaceLookupService.getSpacesById(ids);
    const levelById = new Map(spaces.map(s => [s.id, String(s.level)]));
    for (const membership of spacesById.values()) {
      const level = levelById.get(membership.spaceId);
      if (level !== undefined) {
        membership.level = level;
      }
    }
  }
}
