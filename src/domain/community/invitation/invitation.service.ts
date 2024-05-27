import { CreateInvitationInput } from '@domain/community/invitation';
import {
  Invitation,
  IInvitation,
  DeleteInvitationInput,
} from '@domain/community/invitation';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { invitationLifecycleConfig } from '@domain/community/invitation/invitation.lifecycle.config';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { asyncFilter } from '@common/utils';
import { IUser } from '../user';
import { UserService } from '../user/user.service';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class InvitationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private userService: UserService,
    private lifecycleService: LifecycleService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInvitation(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const invitation: IInvitation = Invitation.create(invitationData);

    invitation.authorization = new AuthorizationPolicy();

    // save the user to get the id assigned
    await this.invitationRepository.save(invitation);

    invitation.lifecycle = await this.lifecycleService.createLifecycle(
      invitation.id,
      invitationLifecycleConfig
    );

    return await this.invitationRepository.save(invitation);
  }

  async deleteInvitation(
    deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitationID = deleteData.ID;
    const invitation = await this.getInvitationOrFail(invitationID);

    if (invitation.authorization)
      await this.authorizationPolicyService.delete(invitation.authorization);

    const result = await this.invitationRepository.remove(
      invitation as Invitation
    );
    result.id = invitationID;
    return result;
  }

  async getInvitationOrFail(
    invitationId: string,
    options?: FindOneOptions<Invitation>
  ): Promise<Invitation | never> {
    const invitation = await this.invitationRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: invitationId,
      },
    });
    if (!invitation)
      throw new EntityNotFoundException(
        `Invitation with ID ${invitationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return invitation;
  }

  async save(invitation: IInvitation): Promise<IInvitation> {
    return await this.invitationRepository.save(invitation);
  }

  async getInvitationState(invitationID: string): Promise<string> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;
    if (lifecycle) {
      return await this.lifecycleService.getState(lifecycle);
    }
    return '';
  }

  async getInvitedUser(invitation: IInvitation): Promise<IUser> {
    const user = await this.userService.getUserOrFail(invitation.invitedUser);
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User for invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getCreatedBy(invitation: IInvitation): Promise<IUser> {
    const user = await this.userService.getUserOrFail(invitation.createdBy);
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User that created invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async findExistingInvitations(
    userID: string,
    communityID: string
  ): Promise<IInvitation[]> {
    const existingInvitations = await this.invitationRepository.find({
      where: { invitedUser: userID, community: { id: communityID } },
      relations: { community: true },
    });

    if (existingInvitations.length > 0) return existingInvitations;
    return [];
  }

  async findInvitationsForUser(
    userID: string,
    states: string[] = []
  ): Promise<IInvitation[]> {
    const findOpts: FindManyOptions<Invitation> = {
      relations: { community: true },
      where: { invitedUser: userID },
    };

    if (states.length) {
      findOpts.relations = {
        ...findOpts.relations,
        lifecycle: true,
      };
      findOpts.select = {
        lifecycle: {
          machineState: true,
          machineDef: true,
        },
      };
    }

    const invitations = await this.invitationRepository.find(findOpts);

    if (states.length) {
      return asyncFilter(invitations, async app =>
        states.includes(await this.getInvitationState(app.id))
      );
    }

    return invitations;
  }

  async isFinalizedInvitation(invitationID: string): Promise<boolean> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;
    if (!lifecycle) {
      throw new RelationshipNotFoundException(
        `Unable to load Lifecycle for Invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    }
    return await this.lifecycleService.isFinalState(lifecycle);
  }

  async canInvitationBeAccepted(invitationID: string): Promise<boolean> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;
    if (!lifecycle) {
      throw new RelationshipNotFoundException(
        `Unable to load Lifecycle for Invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    }
    const canAccept = this.lifecycleService
      .getNextEvents(lifecycle)
      .includes('ACCEPT');
    return canAccept;
  }
}
