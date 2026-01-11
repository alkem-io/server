import { CreateInvitationInput } from '@domain/access/invitation';
import {
  Invitation,
  IInvitation,
  DeleteInvitationInput,
} from '@domain/access/invitation';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { asyncFilter } from '@common/utils';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { InvitationLifecycleService } from './invitation.service.lifecycle';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';

@Injectable()
export class InvitationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private userLookupService: UserLookupService,
    private actorLookupService: ActorLookupService,
    private lifecycleService: LifecycleService,
    private invitationLifecycleService: InvitationLifecycleService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInvitation(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const invitation: IInvitation = Invitation.create(invitationData);

    invitation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INVITATION
    );

    // save the invitation to get the id assigned
    await this.invitationRepository.save(invitation);

    invitation.lifecycle = await this.lifecycleService.createLifecycle();

    return await this.invitationRepository.save(invitation);
  }

  async deleteInvitation(
    deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitationID = deleteData.ID;
    const invitation = await this.getInvitationOrFail(invitationID, {
      relations: {
        roleSet: true,
      },
    });
    await this.lifecycleService.deleteLifecycle(invitation.lifecycle.id);

    if (invitation.authorization)
      await this.authorizationPolicyService.delete(invitation.authorization);

    const result = await this.invitationRepository.remove(
      invitation as Invitation
    );
    result.id = invitationID;

    if (invitation.invitedActorId && invitation.roleSet) {
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        invitation.invitedActorId,
        invitation.roleSet.id
      );
      const actorExists = await this.actorLookupService.actorExists(
        invitation.invitedActorId
      );

      if (!actorExists) {
        this.logger.error(
          {
            message:
              'Unable to invalidate membership status cache for Contributor',
            cause: 'Contributor not found',
            invitationId: invitation.id,
            contributorId: invitation.invitedActorId,
          },
          undefined,
          LogContext.COMMUNITY
        );
      } else {
        await this.roleSetCacheService.deleteMembershipStatusCache(
          invitation.invitedActorId,
          invitation.roleSet.id
        );
      }
    }

    return result;
  }

  async getInvitationOrFail(
    invitationId: string,
    options?: FindOneOptions<Invitation>
  ): Promise<IInvitation | never> {
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

  async getInvitationsOrFail(
    invitationIds: string[],
    options?: FindOptionsWhere<Invitation>
  ): Promise<IInvitation[] | never> {
    const invitations = await this.invitationRepository.findBy({
      ...options,
      id: In(invitationIds),
    });

    if (!invitations || invitationIds.length !== invitations.length)
      throw new EntityNotFoundException(
        `Some invitations couldn't be found with these Ids:${JSON.stringify(invitationIds)}`,
        LogContext.COMMUNITY
      );
    return invitations;
  }

  async save(invitation: IInvitation): Promise<IInvitation> {
    return await this.invitationRepository.save(invitation);
  }

  async getLifecycleState(invitationID: string): Promise<string> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;

    return this.invitationLifecycleService.getState(lifecycle);
  }

  async getInvitedContributor(invitation: IInvitation): Promise<IActor> {
    return this.actorLookupService.getFullActorByIdOrFail(
      invitation.invitedActorId
    );
  }

  async getCreatedByOrFail(invitation: IInvitation): Promise<IUser | never> {
    const user = await this.userLookupService.getUserByIdOrFail(
      invitation.createdBy
    );
    if (!user)
      throw new RelationshipNotFoundException(
        `Unable to load User that created invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    return user;
  }

  async findExistingInvitations(
    contributorID: string,
    roleSetID: string
  ): Promise<IInvitation[]> {
    const existingInvitations = await this.invitationRepository.find({
      where: {
        invitedActorId: contributorID,
        roleSet: { id: roleSetID },
      },
      relations: { roleSet: true },
    });

    if (existingInvitations.length > 0) return existingInvitations;
    return [];
  }

  async findInvitationsForContributor(
    contributorID: string,
    states: string[] = []
  ): Promise<IInvitation[]> {
    const findOpts: FindManyOptions<Invitation> = {
      relations: { roleSet: true },
      where: { invitedActorId: contributorID },
    };

    if (states.length) {
      findOpts.relations = {
        ...findOpts.relations,
        lifecycle: true,
      };
      findOpts.select = {
        lifecycle: {
          machineState: true,
        },
      };
    }

    const invitations = await this.invitationRepository.find(findOpts);

    if (states.length) {
      return asyncFilter(invitations, async app =>
        states.includes(await this.getLifecycleState(app.id))
      );
    }

    return invitations;
  }

  async isFinalizedInvitation(invitationID: string): Promise<boolean> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;

    return this.invitationLifecycleService.isFinalState(lifecycle);
  }

  async canInvitationBeAccepted(invitationID: string): Promise<boolean> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;

    const canAccept = this.invitationLifecycleService
      .getNextEvents(lifecycle)
      .includes('ACCEPT');
    return canAccept;
  }
}
