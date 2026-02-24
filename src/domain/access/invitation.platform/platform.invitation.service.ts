import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IRoleSet } from '../role-set/role.set.interface';
import { CreatePlatformInvitationInput } from './dto/platform.invitation.dto.create';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { PlatformInvitation } from './platform.invitation.entity';
import { IPlatformInvitation } from './platform.invitation.interface';

@Injectable()
export class PlatformInvitationService {
  private acceptedPlatformRoles: RoleName[] = [
    RoleName.PLATFORM_BETA_TESTER,
    RoleName.PLATFORM_VC_CAMPAIGN,
  ];

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(PlatformInvitation)
    private platformInvitationRepository: Repository<PlatformInvitation>,
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

    return await this.platformInvitationRepository.save(platformInvitation);
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

    const result = await this.platformInvitationRepository.remove(
      platformInvitation as PlatformInvitation
    );
    result.id = platformInvitationID;
    return result;
  }

  async getPlatformInvitationOrFail(
    platformInvitationId: string,
    options?: FindOneOptions<PlatformInvitation>
  ): Promise<PlatformInvitation | never> {
    const platformInvitation = await this.platformInvitationRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: platformInvitationId,
      },
    });
    if (!platformInvitation)
      throw new EntityNotFoundException(
        `PlatformInvitation with ID ${platformInvitationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return platformInvitation;
  }

  async save(
    platformInvitation: IPlatformInvitation
  ): Promise<IPlatformInvitation> {
    return await this.platformInvitationRepository.save(platformInvitation);
  }

  async recordProfileCreated(
    platformInvitation: IPlatformInvitation
  ): Promise<IPlatformInvitation> {
    platformInvitation.profileCreated = true;
    return await this.save(platformInvitation);
  }

  async getCreatedBy(platformInvitation: IPlatformInvitation): Promise<IUser> {
    const user = await this.userLookupService.getUserByIdOrFail(
      platformInvitation.createdBy
    );
    return user;
  }

  async findPlatformInvitationsForUser(
    email: string
  ): Promise<IPlatformInvitation[]> {
    const existingPlatformInvitations =
      await this.platformInvitationRepository.find({
        where: { email: email.toLowerCase() },
        relations: { roleSet: true },
      });

    if (existingPlatformInvitations.length > 0)
      return existingPlatformInvitations;
    return [];
  }

  async getExistingPlatformInvitationForRoleSet(
    email: string,
    roleSetID: string
  ): Promise<IPlatformInvitation | undefined> {
    const existingPlatformInvitations =
      await this.platformInvitationRepository.find({
        where: {
          email: email.toLowerCase(),
          roleSet: {
            id: roleSetID,
          },
        },
        relations: { roleSet: true },
      });

    if (existingPlatformInvitations.length > 1) {
      throw new RoleSetMembershipException(
        `Found roleSet invitations for email ${email} and roleSet ${roleSetID}, but only one is expected!`,
        LogContext.ROLES
      );
    }
    if (existingPlatformInvitations.length === 1) {
      return existingPlatformInvitations[0];
    }
    return undefined;
  }
}
