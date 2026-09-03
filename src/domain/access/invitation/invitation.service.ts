import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { asyncFilter } from '@common/utils';
import {
  CreateInvitationInput,
  DeleteInvitationInput,
  IInvitation,
  Invitation,
} from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

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
    deleteData: DeleteInvitationInput,
    em?: EntityManager
  ): Promise<IInvitation> {
    const invitationID = deleteData.ID;
    const invitation = await this.getInvitationOrFail(invitationID, {
      relations: {
        roleSet: true,
      },
    });
    await this.lifecycleService.deleteLifecycle(invitation.lifecycle.id, em);

    if (invitation.authorization)
      await this.authorizationPolicyService.delete(
        invitation.authorization,
        em
      );

    const result = em
      ? await em.remove(invitation as Invitation)
      : await this.invitationRepository.remove(invitation as Invitation);
    result.id = invitationID;

    if (invitation.invitedActorID && invitation.roleSet) {
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        invitation.invitedActorID,
        invitation.roleSet.id
      );
      const actorExists = await this.actorLookupService.actorExists(
        invitation.invitedActorID
      );

      if (!actorExists) {
        this.logger.error(
          {
            message: 'Unable to invalidate membership status cache for Actor',
            cause: 'Actor not found',
            invitationId: invitation.id,
            actorID: invitation.invitedActorID,
          },
          undefined,
          LogContext.COMMUNITY
        );
      } else {
        await this.roleSetCacheService.deleteMembershipStatusCache(
          invitation.invitedActorID,
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

  async getInvitedActor(invitation: IInvitation): Promise<IActor> {
    return this.actorLookupService.getFullActorByIdOrFail(
      invitation.invitedActorID
    );
  }

  async getCreatedByOrFail(invitation: IInvitation): Promise<IUser | never> {
    if (!invitation.createdBy) {
      throw new RelationshipNotFoundException(
        'Invitation creator has been removed',
        LogContext.COMMUNITY,
        { invitationId: invitation.id }
      );
    }
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
    actorID: string,
    roleSetID: string
  ): Promise<IInvitation[]> {
    const existingInvitations = await this.invitationRepository.find({
      where: {
        invitedActorID: actorID,
        roleSet: { id: roleSetID },
      },
      relations: { roleSet: true },
    });

    if (existingInvitations.length > 0) return existingInvitations;
    return [];
  }

  async findInvitationsForActor(
    actorID: string,
    states: string[] = []
  ): Promise<IInvitation[]> {
    const findOpts: FindManyOptions<Invitation> = {
      relations: { roleSet: true },
      where: { invitedActorID: actorID },
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
    return this.canAcceptInvitation(invitation);
  }

  /** Synchronous check when the entity (with eager lifecycle) is already loaded. */
  isInvitationFinalized(invitation: IInvitation): boolean {
    return this.invitationLifecycleService.isFinalState(invitation.lifecycle);
  }

  /** Synchronous check when the entity (with eager lifecycle) is already loaded. */
  canAcceptInvitation(invitation: IInvitation): boolean {
    return this.invitationLifecycleService
      .getNextEvents(invitation.lifecycle)
      .includes('ACCEPT');
  }

  /**
   * Counts the still-open (non-finalized) invitations on a RoleSet that
   * carry a given extra role and target a given actor type. Used by the
   * advisory Lead-slot check: a stale, never-accepted invitation still
   * holds its slot until it is revoked or acted on.
   */
  async countOpenInvitationsForRoleSet(
    roleSetID: string,
    filter: { extraRole: RoleName; actorType: ActorType }
  ): Promise<number> {
    const invitations = await this.invitationRepository.find({
      where: { roleSet: { id: roleSetID } },
      relations: { lifecycle: true },
    });

    const openWithRole = invitations.filter(
      invitation =>
        invitation.extraRoles?.includes(filter.extraRole) &&
        !this.isInvitationFinalized(invitation)
    );

    if (openWithRole.length === 0) {
      return 0;
    }

    const actorTypes = await this.actorLookupService.validateActorsAndGetTypes(
      openWithRole.map(invitation => invitation.invitedActorID)
    );

    return openWithRole.filter(
      invitation =>
        actorTypes.get(invitation.invitedActorID) === filter.actorType
    ).length;
  }
}
