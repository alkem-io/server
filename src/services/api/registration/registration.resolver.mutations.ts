import { PRIVILEGED_SESSION_WINDOW_MS } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { SessionRefreshRequiredException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  redactError,
  redactStack,
} from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { DeleteOrganizationInput } from '@domain/community/organization/dto/organization.dto.delete';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AccountDeletionInitiatorBranch } from '@domain/community/user/account-deletion/account.deletion.blocker.service';
import { CreateUserInput } from '@domain/community/user/dto/user.dto.create';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationInputPlatformUserRemoved } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.removed';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RegistrationService } from './registration.service';

@InstrumentResolver()
@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private registrationService: RegistrationService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  async createUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${actorContext.actorID}`
    );

    // Create the user entity
    const user = await this.userService.createUser(userData);

    // Finalize: authorization + invitations + notification (same path as registerNewUser)
    await this.registrationService.finalizeUserRegistration(user);

    return await this.userService.getUserByIdOrFail(user.id);
  }

  @Mutation(() => IOrganization, {
    description: 'Creates a new Organization on the platform.',
  })
  async createOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('organizationData') organizationData: CreateOrganizationInput
  ): Promise<IOrganization> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Organization: ${organizationData.nameID}`
    );
    const organization = await this.organizationService.createOrganization(
      organizationData,
      actorContext
    );
    const organizationAuthorizations =
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
    await this.authorizationPolicyService.saveAll(organizationAuthorizations);

    const organizationAccount =
      await this.organizationService.getAccount(organization);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        organizationAccount
      );
    await this.authorizationPolicyService.saveAll(accountAuthorizations);

    return await this.organizationService.getOrganizationOrFail(
      organization.id
    );
  }

  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    // Self-ness is derived server-side (actor == target), never trusted from
    // the caller — the same derivation the shared blocker predicate and the
    // freshness gate below both key off.
    const isSelf = actorContext.actorID === deleteData.ID;
    const branch: AccountDeletionInitiatorBranch = isSelf ? 'self' : 'admin';

    if (isSelf) {
      // The freshness gate: refuse before any deletion work when the
      // calling session was not issued within the privileged window.
      // Fail CLOSED on a missing/zero/unparseable issuedAt — never treat an
      // undeterminable freshness as fresh. Not applied on admin-on-other.
      const issuedAt = actorContext.issuedAt;
      if (!issuedAt || Date.now() - issuedAt > PRIVILEGED_SESSION_WINDOW_MS) {
        throw new SessionRefreshRequiredException(
          'Deleting your own account requires a recently re-authenticated session',
          LogContext.AUTH
        );
      }
    }

    const user = await this.userService.getUserByIdOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.id}`
    );

    // On the self branch the sign-in identity is always removed, overriding
    // any caller-supplied value: a surviving identity would otherwise mint a
    // fresh, empty account at the departed user's next sign-in.
    const effectiveDeleteData: DeleteUserInput = isSelf
      ? { ...deleteData, deleteIdentity: true }
      : deleteData;

    // On the self branch the initiator IS `user`, whose row is gone from
    // the primary store by the time the notification below runs — resolve
    // its payload now, from the still-loaded pre-deletion entity, so the
    // notification never has to look the (about to be) deleted initiator
    // up by id after the fact.
    const triggeredByPayload = isSelf
      ? this.notificationExternalAdapter.createUserPayloadFromUser(user)
      : undefined;

    const userDeleted =
      await this.registrationService.deleteUserWithPendingMemberships(
        effectiveDeleteData,
        branch,
        actorContext.actorID
      );

    // Best-effort: the mutation must resolve successfully regardless of
    // whether this notification can be sent (it previously wasn't — the
    // self path's post-deletion lookup of the now-gone initiator threw
    // AFTER the account was already irreversibly deleted).
    const notificationInput: NotificationInputPlatformUserRemoved = {
      triggeredBy: actorContext.actorID,
      user,
      triggeredByPayload,
    };
    try {
      await this.notificationPlatformAdapter.platformUserRemoved(
        notificationInput
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Failed to send the platform user-removed notification; the deletion still stands',
          userID: deleteData.ID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.COMMUNITY
      );
    }
    return userDeleted;
  }

  @Mutation(() => IOrganization, {
    description: 'Deletes the specified Organization.',
  })
  async deleteOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${organization.id}`
    );
    return await this.registrationService.deleteOrganizationWithPendingMemberships(
      deleteData
    );
  }
}
