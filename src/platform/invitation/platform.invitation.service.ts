import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IPlatformInvitation } from './platform.invitation.interface';
import { PlatformInvitation } from './platform.invitation.entity';
import { CreatePlatformInvitationInput } from './dto/platform.invitation.dto.create';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { PlatformRole } from '@common/enums/platform.role';

@Injectable()
export class PlatformInvitationService {
  private acceptedPlatformRoles: PlatformRole[] = [
    PlatformRole.BETA_TESTER,
    PlatformRole.VC_CAMPAIGN,
  ];

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(PlatformInvitation)
    private platformInvitationRepository: Repository<PlatformInvitation>,
    private userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createPlatformInvitation(
    platformInvitationData: CreatePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    // Only allow invitations to specific set of platform roles
    const role = platformInvitationData.platformRole;
    if (role !== undefined && !this.acceptedPlatformRoles.includes(role)) {
      throw new ValidationException(
        `Invalid platform role: ${role}`,
        LogContext.PLATFORM
      );
    }
    const platformInvitation: IPlatformInvitation = PlatformInvitation.create(
      platformInvitationData
    );

    platformInvitation.authorization = new AuthorizationPolicy();

    return await this.platformInvitationRepository.save(platformInvitation);
  }

  async deletePlatformInvitation(
    deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitationID = deleteData.ID;
    const platformInvitation = await this.getPlatformInvitationOrFail(
      platformInvitationID
    );

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
    const user = await this.userLookupService.getUserByUuidOrFail(
      platformInvitation.createdBy
    );
    return user;
  }

  async findPlatformInvitationsForUser(
    email: string
  ): Promise<IPlatformInvitation[]> {
    const existingPlatformInvitations =
      await this.platformInvitationRepository.find({
        where: { email: email },
        relations: { community: true },
      });

    if (existingPlatformInvitations.length > 0)
      return existingPlatformInvitations;
    return [];
  }
}
