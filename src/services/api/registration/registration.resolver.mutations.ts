import { Inject, LoggerService, BadRequestException } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { RegistrationService } from './registration.service';
import { NotificationInputPlatformUserRegistered } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.registered';
import { UserService } from '@domain/community/user/user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { NotificationInputPlatformUserRemoved } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.removed';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { CreateUserInput } from '@domain/community/user/dto/user.dto.create';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteOrganizationInput } from '@domain/community/organization/dto/organization.dto.delete';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';

@InstrumentResolver()
@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private readonly userAuthorizationService: UserAuthorizationService,
    private readonly notificationPlatformAdapter: NotificationPlatformAdapter,
    private readonly registrationService: RegistrationService,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly organizationAuthorizationService: OrganizationAuthorizationService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly accountAuthorizationService: AccountAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description:
      'Creates a new User profile on the platform for a user that has a valid Authentication session.',
  })
  async createUserNewRegistration(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    const identity = await this.kratosService.getIdentityById(
      agentInfo.authenticationID,
      ['oidc']
    );
    if (!identity) {
      throw new BadRequestException(
        `Identity not found for authenticationID: ${agentInfo.authenticationID}`
      );
    }
    const email = this.kratosService.getEmailFromIdentity(identity);
    if (!email) {
      throw new BadRequestException(
        `Email not found for identity: ${identity.id}`
      );
    }
    let emailVerified = this.kratosService.isEmailVerified(identity);

    if (!emailVerified && identity.credentials?.oidc) {
      emailVerified = true;
    }

    const user = await this.registrationService.registerNewUser(
      agentInfo,
      email,
      emailVerified
    );
    return await this.processCreatedUser(user);
  }

  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  async createUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${agentInfo.userID || 'anonymous'}`
    );
    const user = await this.userService.createUser(userData);
    return this.processCreatedUser(user);
  }

  private async processCreatedUser(userInput: IUser): Promise<IUser> {
    const user =
      await this.userAuthorizationService.grantCredentialsAllUsersReceive(
        userInput.id
      );

    const userAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
    await this.authorizationPolicyService.saveAll(userAuthorizations);

    const userAccount = await this.userService.getAccount(user);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        userAccount
      );
    await this.authorizationPolicyService.saveAll(accountAuthorizations);

    await this.registrationService.processPendingInvitations(user);

    await this.userCreatedEvents(user);
    return await this.userService.getUserOrFail(user.id);
  }

  @Mutation(() => IOrganization, {
    description: 'Creates a new Organization on the platform.',
  })
  async createOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organizationData') organizationData: CreateOrganizationInput
  ): Promise<IOrganization> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Organization: ${organizationData.nameID}`
    );
    const organization = await this.organizationService.createOrganization(
      organizationData,
      agentInfo
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

  private async userCreatedEvents(user: IUser) {
    // Send the notification
    const notificationInput: NotificationInputPlatformUserRegistered = {
      triggeredBy: user.id,
      userID: user.id,
    };
    await this.notificationPlatformAdapter.platformUserProfileCreated(
      notificationInput
    );
  }

  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  async deleteUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    this.authorizationService.grantAccessOrFail(
      agentInfo,
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
      triggeredBy: agentInfo.userID,
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      deleteData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${organization.id}`
    );
    return await this.registrationService.deleteOrganizationWithPendingMemberships(
      deleteData
    );
  }
}
