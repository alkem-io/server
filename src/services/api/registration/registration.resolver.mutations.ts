import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { DeleteOrganizationInput } from '@domain/community/organization/dto/organization.dto.delete';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
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
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RegistrationService } from './registration.service';

@InstrumentResolver()
@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private notificationPlatformAdapter: NotificationPlatformAdapter,
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
    const user = await this.userService.getUserByIdOrFail(deleteData.ID, {
      relations: { actor: { profile: true } },
    });
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.id}`
    );
    const userDeleted =
      await this.registrationService.deleteUserWithPendingMemberships(
        deleteData
      );
    // Send the notification
    const notificationInput: NotificationInputPlatformUserRemoved = {
      triggeredBy: actorContext.actorID,
      user,
    };
    await this.notificationPlatformAdapter.platformUserRemoved(
      notificationInput
    );
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
