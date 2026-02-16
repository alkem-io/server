import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoleSet } from '../role-set/role.set.interface';
import { CreatePlatformInvitationInput } from './dto/platform.invitation.dto.create';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { PlatformInvitation } from './platform.invitation.entity';
import { IPlatformInvitation } from './platform.invitation.interface';
import { platformInvitations } from './platform.invitation.schema';

@Injectable()
export class PlatformInvitationService {
  private acceptedPlatformRoles: RoleName[] = [
    RoleName.PLATFORM_BETA_TESTER,
    RoleName.PLATFORM_VC_CAMPAIGN,
  ];

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createPlatformInvitation(
    roleSet: IRoleSet,
    platformInvitationData: CreatePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    // Only allow invitations to specific set of platform roles
    if (roleSet.type === RoleSetType.PLATFORM) {
      const roles = platformInvitationData.roleSetExtraRoles;
      for (const role of roles) {
        if (!this.acceptedPlatformRoles.includes(role)) {
          throw new ValidationException(
            `Unable to create invitation for platform role: ${role}, not in allowed invitation roles: ${this.acceptedPlatformRoles}`,
            LogContext.PLATFORM
          );
        }
      }
    }
    platformInvitationData.email = platformInvitationData.email
      .trim()
      .toLowerCase();
    const platformInvitation: IPlatformInvitation = PlatformInvitation.create(
      platformInvitationData
    );

    platformInvitation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INVITATION
    );

    return await this.save(platformInvitation);
  }

  async deletePlatformInvitation(
    deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitationID = deleteData.ID;
    const platformInvitation =
      await this.getPlatformInvitationOrFail(platformInvitationID);

    if (platformInvitation.authorization)
      await this.authorizationPolicyService.delete(
        platformInvitation.authorization
      );

    await this.db
      .delete(platformInvitations)
      .where(eq(platformInvitations.id, platformInvitationID));
    return platformInvitation;
  }

  async getPlatformInvitationOrFail(
    platformInvitationId: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<PlatformInvitation | never> {
    const platformInvitation = await this.db.query.platformInvitations.findFirst({
      where: eq(platformInvitations.id, platformInvitationId),
      with: options?.with,
    });
    if (!platformInvitation)
      throw new EntityNotFoundException(
        `PlatformInvitation with ID ${platformInvitationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return platformInvitation as unknown as PlatformInvitation;
  }

  async save(
    platformInvitation: IPlatformInvitation
  ): Promise<IPlatformInvitation> {
    if (platformInvitation.id) {
      const [updated] = await this.db
        .update(platformInvitations)
        .set({
          email: platformInvitation.email,
          firstName: platformInvitation.firstName ?? null,
          lastName: platformInvitation.lastName ?? null,
          createdBy: platformInvitation.createdBy,
          welcomeMessage: platformInvitation.welcomeMessage ?? null,
          profileCreated: platformInvitation.profileCreated,
          roleSetInvitedToParent: platformInvitation.roleSetInvitedToParent,
          roleSetExtraRoles: platformInvitation.roleSetExtraRoles,
          roleSetId: platformInvitation.roleSet?.id ?? null,
          authorizationId: platformInvitation.authorization?.id ?? null,
        })
        .where(eq(platformInvitations.id, platformInvitation.id))
        .returning();
      return { ...platformInvitation, ...updated } as unknown as IPlatformInvitation;
    }
    const [inserted] = await this.db
      .insert(platformInvitations)
      .values({
        email: platformInvitation.email,
        firstName: platformInvitation.firstName ?? null,
        lastName: platformInvitation.lastName ?? null,
        createdBy: platformInvitation.createdBy,
        welcomeMessage: platformInvitation.welcomeMessage ?? null,
        profileCreated: platformInvitation.profileCreated,
        roleSetInvitedToParent: platformInvitation.roleSetInvitedToParent,
        roleSetExtraRoles: platformInvitation.roleSetExtraRoles,
        roleSetId: platformInvitation.roleSet?.id ?? null,
        authorizationId: platformInvitation.authorization?.id ?? null,
      })
      .returning();
    return { ...platformInvitation, ...inserted } as unknown as IPlatformInvitation;
  }

  async recordProfileCreated(
    platformInvitation: IPlatformInvitation
  ): Promise<IPlatformInvitation> {
    platformInvitation.profileCreated = true;
    return await this.save(platformInvitation);
  }

  async getCreatedBy(platformInvitation: IPlatformInvitation): Promise<IUser> {
    const user = await this.userLookupService.getUserOrFail(
      platformInvitation.createdBy
    );
    return user;
  }

  async findPlatformInvitationsForUser(
    email: string
  ): Promise<IPlatformInvitation[]> {
    const existingPlatformInvitations =
      await this.db.query.platformInvitations.findMany({
        where: eq(platformInvitations.email, email.toLowerCase()),
        with: { roleSet: true },
      });

    if (existingPlatformInvitations.length > 0)
      return existingPlatformInvitations as unknown as IPlatformInvitation[];
    return [];
  }

  async getExistingPlatformInvitationForRoleSet(
    email: string,
    roleSetID: string
  ): Promise<IPlatformInvitation | undefined> {
    const existingPlatformInvitations =
      await this.db.query.platformInvitations.findMany({
        where: and(
          eq(platformInvitations.email, email.toLowerCase()),
          eq(platformInvitations.roleSetId, roleSetID)
        ),
        with: { roleSet: true },
      });

    if (existingPlatformInvitations.length > 1) {
      throw new RoleSetMembershipException(
        `Found roleSet invitations for email ${email} and roleSet ${roleSetID}, but only one is expected!`,
        LogContext.ROLES
      );
    }
    if (existingPlatformInvitations.length === 1) {
      return existingPlatformInvitations[0] as unknown as IPlatformInvitation;
    }
    return undefined;
  }
}
