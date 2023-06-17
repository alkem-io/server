import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '../user';
import { UserService } from '../user/user.service';
import { IInvitationExternal } from './invitation.external.interface';
import { InvitationExternal } from './invitation.external.entity';
import { CreateInvitationExternalInput } from './dto/invitation.external.dto.create';
import { DeleteInvitationExternalInput } from './dto/invitation.external..dto.delete';

@Injectable()
export class InvitationExternalService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(InvitationExternal)
    private invitationExternalRepository: Repository<InvitationExternal>,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInvitationExternal(
    invitationExternalData: CreateInvitationExternalInput
  ): Promise<IInvitationExternal> {
    const invitationExternal: IInvitationExternal = InvitationExternal.create(
      invitationExternalData
    );

    invitationExternal.authorization = new AuthorizationPolicy();

    return await this.invitationExternalRepository.save(invitationExternal);
  }

  async deleteInvitationExternal(
    deleteData: DeleteInvitationExternalInput
  ): Promise<IInvitationExternal> {
    const invitationExternalID = deleteData.ID;
    const invitationExternal = await this.getInvitationExternalOrFail(
      invitationExternalID
    );

    if (invitationExternal.authorization)
      await this.authorizationPolicyService.delete(
        invitationExternal.authorization
      );

    const result = await this.invitationExternalRepository.remove(
      invitationExternal as InvitationExternal
    );
    result.id = invitationExternalID;
    return result;
  }

  async getInvitationExternalOrFail(
    invitationExternalId: string,
    options?: FindOneOptions<InvitationExternal>
  ): Promise<InvitationExternal | never> {
    const invitationExternal = await this.invitationExternalRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: invitationExternalId,
      },
    });
    if (!invitationExternal)
      throw new EntityNotFoundException(
        `InvitationExternal with ID ${invitationExternalId} can not be found!`,
        LogContext.COMMUNITY
      );
    return invitationExternal;
  }

  async save(
    invitationExternal: IInvitationExternal
  ): Promise<IInvitationExternal> {
    return await this.invitationExternalRepository.save(invitationExternal);
  }

  async getCreatedBy(invitationExternal: IInvitationExternal): Promise<IUser> {
    const user = await this.userService.getUserOrFail(
      invitationExternal.createdBy
    );
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User that created invitationExternal ${invitationExternal.id} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async findInvitationExternalsForUser(
    email: string
  ): Promise<IInvitationExternal[]> {
    const existingInvitationExternals =
      await this.invitationExternalRepository.find({
        where: { email: email },
        relations: ['community'],
      });

    if (existingInvitationExternals.length > 0)
      return existingInvitationExternals;
    return [];
  }
}
