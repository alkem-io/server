import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { asyncFilter } from '@common/utils';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  CreateInvitationInput,
  DeleteInvitationInput,
  IInvitation,
  Invitation,
} from '@domain/access/invitation';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { getContributorType } from '@domain/community/contributor/get.contributor.type';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { invitations } from './invitation.schema';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

@Injectable()
export class InvitationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private userLookupService: UserLookupService,
    private contributorService: ContributorService,
    private lifecycleService: LifecycleService,
    private invitationLifecycleService: InvitationLifecycleService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInvitation(
    invitationData: CreateInvitationInput,
    contributor: IContributor
  ): Promise<IInvitation> {
    const invitation: IInvitation = Invitation.create(invitationData);
    invitation.contributorType = getContributorType(contributor);

    invitation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INVITATION
    );

    // save the entity to get the id assigned
    const saved = await this.save(invitation);

    saved.lifecycle = await this.lifecycleService.createLifecycle();

    return await this.save(saved);
  }

  async deleteInvitation(
    deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitationID = deleteData.ID;
    const invitation = await this.getInvitationOrFail(invitationID, {
      with: {
        roleSet: true,
      },
    });
    await this.lifecycleService.deleteLifecycle(invitation.lifecycle.id);

    if (invitation.authorization)
      await this.authorizationPolicyService.delete(invitation.authorization);

    await this.db
      .delete(invitations)
      .where(eq(invitations.id, invitationID));

    if (invitation.invitedContributorID && invitation.roleSet) {
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        invitation.invitedContributorID,
        invitation.roleSet.id
      );
      const contributor = await this.contributorService.getContributor(
        invitation.invitedContributorID,
        {
          with: { agent: true },
        }
      );

      if (!contributor || !contributor.agent) {
        this.logger.error(
          {
            message:
              'Unable to invalidate membership status cache for Contributor',
            cause: 'Contributor or associated Agent not found',
            invitationId: invitation.id,
            contributorId: invitation.invitedContributorID,
          },
          undefined,
          LogContext.COMMUNITY
        );
      } else {
        await this.roleSetCacheService.deleteMembershipStatusCache(
          contributor.agent.id,
          invitation.roleSet.id
        );
      }
    }

    return invitation;
  }

  async getInvitationOrFail(
    invitationId: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IInvitation | never> {
    const invitation = await this.db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
      with: options?.with,
    });
    if (!invitation)
      throw new EntityNotFoundException(
        `Invitation with ID ${invitationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return invitation as unknown as IInvitation;
  }

  async getInvitationsOrFail(
    invitationIds: string[]
  ): Promise<IInvitation[] | never> {
    const result = await this.db.query.invitations.findMany({
      where: inArray(invitations.id, invitationIds),
    });

    if (!result || invitationIds.length !== result.length)
      throw new EntityNotFoundException(
        `Some invitations couldn't be found with these Ids:${JSON.stringify(invitationIds)}`,
        LogContext.COMMUNITY
      );
    return result as unknown as IInvitation[];
  }

  async save(invitation: IInvitation): Promise<IInvitation> {
    if (invitation.id) {
      const [updated] = await this.db
        .update(invitations)
        .set({
          invitedContributorID: invitation.invitedContributorID,
          createdBy: invitation.createdBy,
          welcomeMessage: invitation.welcomeMessage ?? null,
          invitedToParent: invitation.invitedToParent,
          contributorType: invitation.contributorType,
          extraRoles: invitation.extraRoles,
          lifecycleId: invitation.lifecycle?.id ?? null,
          roleSetId: invitation.roleSet?.id ?? null,
          authorizationId: invitation.authorization?.id ?? null,
        })
        .where(eq(invitations.id, invitation.id))
        .returning();
      return { ...invitation, ...updated } as unknown as IInvitation;
    }
    const [inserted] = await this.db
      .insert(invitations)
      .values({
        invitedContributorID: invitation.invitedContributorID,
        createdBy: invitation.createdBy,
        welcomeMessage: invitation.welcomeMessage ?? null,
        invitedToParent: invitation.invitedToParent,
        contributorType: invitation.contributorType,
        extraRoles: invitation.extraRoles,
        lifecycleId: invitation.lifecycle?.id ?? null,
        roleSetId: invitation.roleSet?.id ?? null,
        authorizationId: invitation.authorization?.id ?? null,
      })
      .returning();
    return { ...invitation, ...inserted } as unknown as IInvitation;
  }

  async getLifecycleState(invitationID: string): Promise<string> {
    const invitation = await this.getInvitationOrFail(invitationID);
    const lifecycle = invitation.lifecycle;

    return this.invitationLifecycleService.getState(lifecycle);
  }

  async getInvitedContributor(invitation: IInvitation): Promise<IContributor> {
    const contributor =
      await this.contributorService.getContributorByUuidOrFail(
        invitation.invitedContributorID
      );
    if (!contributor)
      throw new RelationshipNotFoundException(
        `Unable to load contributor for invitation ${invitation.id} `,
        LogContext.COMMUNITY
      );
    return contributor;
  }

  async getCreatedByOrFail(invitation: IInvitation): Promise<IUser | never> {
    const user = await this.userLookupService.getUserOrFail(
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
    const existingInvitations = await this.db.query.invitations.findMany({
      where: and(
        eq(invitations.invitedContributorID, contributorID),
        eq(invitations.roleSetId, roleSetID)
      ),
      with: { roleSet: true },
    });

    if (existingInvitations.length > 0) return existingInvitations as unknown as IInvitation[];
    return [];
  }

  async findInvitationsForContributor(
    contributorID: string,
    states: string[] = []
  ): Promise<IInvitation[]> {
    const withRelations: Record<string, boolean> = { roleSet: true };

    if (states.length) {
      withRelations.lifecycle = true;
    }

    const result = await this.db.query.invitations.findMany({
      where: eq(invitations.invitedContributorID, contributorID),
      with: withRelations as any,
    });

    const typedResult = result as unknown as IInvitation[];

    if (states.length) {
      return asyncFilter(typedResult, async app =>
        states.includes(await this.getLifecycleState(app.id))
      );
    }

    return typedResult;
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
}
