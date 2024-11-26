import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SpaceService } from '@domain/space/space/space.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import * as defaultRoles from './platform-template-definitions/user/users.json';
import * as defaultLicensePlan from './platform-template-definitions/license-plan/license-plans.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { LogContext } from '@common/enums';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import {
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
  DEFAULT_SPACE_DISPLAYNAME,
  DEFAULT_SPACE_NAMEID,
} from '@common/constants';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AdminAuthorizationService } from '@platform/admin/authorization/admin.authorization.service';
import { PlatformService } from '@platform/platform/platform.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { SpaceType } from '@common/enums/space.type';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { Space } from '@domain/space/space/space.entity';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IUser } from '@domain/community/user/user.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { TemplateDefaultService } from '@domain/template/template-default/template.default.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { bootstrapSubspaceKnowledgeInnovationFlowStates } from './platform-template-definitions/subspace-knowledge/bootstrap.subspace.knowledge.innovation.flow.states';
import { bootstrapSubspaceKnowledgeCallouts } from './platform-template-definitions/subspace-knowledge/bootstrap.subspace.knowledge.callouts';
import { bootstrapSubspaceKnowledgeCalloutGroups } from './platform-template-definitions/subspace-knowledge/bootstrap.subspace.knowledge.callout.groups';
import { ITemplateDefault } from '@domain/template/template-default/template.default.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';
import { bootstrapSubspaceInnovationFlowStates } from './platform-template-definitions/subspace/bootstrap.subspace.innovation.flow.states';
import { bootstrapSubspaceCalloutGroups } from './platform-template-definitions/subspace/bootstrap.subspace.callout.groups';
import { bootstrapSubspaceCallouts } from './platform-template-definitions/subspace/bootstrap.subspace.callouts';
import { bootstrapSpaceInnovationFlowStates } from './platform-template-definitions/space/bootstrap.space.innovation.flow';
import { bootstrapSpaceCalloutGroups } from './platform-template-definitions/space/bootstrap.space.callout.groups';
import { bootstrapSpaceCallouts } from './platform-template-definitions/space/bootstrap.space.callouts';
import { bootstrapSpaceTutorialsInnovationFlowStates } from './platform-template-definitions/space-tutorials/bootstrap.space.tutorials.innovation.flow.states';
import { bootstrapSpaceTutorialsCalloutGroups } from './platform-template-definitions/space-tutorials/bootstrap.space.tutorials.callout.groups';
import { bootstrapSpaceTutorialsCallouts } from './platform-template-definitions/space-tutorials/bootstrap.space.tutorials.callouts';
import { LicenseService } from '@domain/common/license/license.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private agentService: AgentService,
    private spaceService: SpaceService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private organizationService: OrganizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private configService: ConfigService,
    private platformService: PlatformService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private aiServer: AiServerService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private templatesManagerService: TemplatesManagerService,
    private templatesSetService: TemplatesSetService,
    private templateDefaultService: TemplateDefaultService,
    private accountLicenseService: AccountLicenseService,
    private licenseService: LicenseService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licensePlanService: LicensePlanService
  ) {}

  async bootstrap() {
    // this.ingestService.ingest(); // todo remove later
    try {
      this.logger.verbose?.('Bootstrapping...', LogContext.BOOTSTRAP);

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        'monitoring.logging.profiling_enabled',
        { infer: true }
      );
      if (profilingEnabled) {
        Profiling.profilingEnabled = profilingEnabled;
      }

      await this.bootstrapUserProfiles();
      await this.bootstrapLicensePlans();
      await this.platformService.ensureForumCreated();
      await this.ensureAuthorizationsPopulated();
      await this.ensurePlatformTemplatesArePresent();
      await this.ensureOrganizationSingleton();
      await this.ensureSpaceSingleton();
      await this.ensureSsiPopulated();
      // reset auth as last in the actions
      // await this.ensureSpaceNamesInElastic();
    } catch (error: any) {
      this.logger.error(
        `Unable to complete bootstrap process: ${error}`,
        error?.stack,
        LogContext.BOOTSTRAP
      );
      throw new BootstrapException(error.message, { originalException: error });
    }
  }

  private async ensurePlatformTemplatesArePresent() {
    const templatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    const templateDefaults =
      await this.templatesManagerService.getTemplateDefaults(
        templatesManager.id
      );
    const templatesSet =
      await this.templatesManagerService.getTemplatesSetOrFail(
        templatesManager.id
      );
    let authResetNeeded = await this.ensureSubspaceKnowledgeTemplatesArePresent(
      templateDefaults,
      TemplateDefaultType.PLATFORM_SPACE,
      templatesSet,
      'space',
      bootstrapSpaceInnovationFlowStates,
      bootstrapSpaceCalloutGroups,
      bootstrapSpaceCallouts
    );
    authResetNeeded =
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
        templatesSet,
        'space',
        bootstrapSpaceTutorialsInnovationFlowStates,
        bootstrapSpaceTutorialsCalloutGroups,
        bootstrapSpaceTutorialsCallouts
      )) || authResetNeeded;
    authResetNeeded =
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
        templatesSet,
        'knowledge',
        bootstrapSubspaceKnowledgeInnovationFlowStates,
        bootstrapSubspaceKnowledgeCalloutGroups,
        bootstrapSubspaceKnowledgeCallouts
      )) || authResetNeeded;
    authResetNeeded =
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SUBSPACE,
        templatesSet,
        'challenge',
        bootstrapSubspaceInnovationFlowStates,
        bootstrapSubspaceCalloutGroups,
        bootstrapSubspaceCallouts
      )) || authResetNeeded;
    if (authResetNeeded) {
      this.logger.verbose?.(
        '=== Identified that template defaults had not been reset; resetting auth now ===',
        LogContext.BOOTSTRAP
      );
      const updatedAuthorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }
  }

  private async ensureSubspaceKnowledgeTemplatesArePresent(
    templateDefaults: ITemplateDefault[],
    templateDefaultType: TemplateDefaultType,
    templatesSet: ITemplatesSet,
    nameID: string,
    flowStates: IInnovationFlowState[],
    calloutGroups: any[],
    callouts: any[]
  ): Promise<boolean> {
    const knowledgeTemplateDefault = templateDefaults.find(
      td => td.type === templateDefaultType
    );
    if (!knowledgeTemplateDefault) {
      throw new BootstrapException(
        `Unable to load Template Default for ${templateDefaultType}`
      );
    }
    if (!knowledgeTemplateDefault.template) {
      this.logger.verbose?.(
        `No template set for ${templateDefaultType}, setting it...`,
        LogContext.BOOTSTRAP
      );
      // No template set, so create one and then set it
      const template = await this.templatesSetService.createTemplate(
        templatesSet,
        {
          profileData: {
            displayName: `${nameID} Template`,
          },
          type: TemplateType.COLLABORATION,
          collaborationData: {
            innovationFlowData: {
              profile: {
                displayName: `${nameID} Innovation Flow`,
              },
              states: flowStates,
            },
            calloutGroups: calloutGroups,
            calloutsData: callouts,
            defaultCalloutGroupName: calloutGroups[0].displayName,
          },
        }
      );
      // Set the default template
      knowledgeTemplateDefault.template = template;
      await this.templateDefaultService.save(knowledgeTemplateDefault);
      return true;
    }
    return false;
  }

  async bootstrapUserProfiles() {
    const bootstrapAuthorizationRolesJson = {
      ...defaultRoles,
    };

    this.logger.verbose?.(
      'Authorization bootstrap: default configuration being loaded',
      LogContext.BOOTSTRAP
    );

    const users = bootstrapAuthorizationRolesJson.users;
    if (!users) {
      this.logger.verbose?.(
        'No users section in the authorization bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(users);
    }
  }

  async bootstrapLicensePlans() {
    const bootstrapLicensePlans = {
      ...defaultLicensePlan,
    };

    const licensePlans = bootstrapLicensePlans.licensePlans;
    if (!licensePlans) {
      this.logger.verbose?.(
        'No licensePlans section in the license plans bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createLicensePlans(licensePlans);
    }
  }

  async createLicensePlans(licensePlansData: any[]) {
    try {
      const licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
      for (const licensePlanData of licensePlansData) {
        const planExists =
          await this.licensePlanService.licensePlanByNameExists(
            licensePlanData.name
          );
        if (!planExists) {
          await this.licensingFrameworkService.createLicensePlan({
            ...licensePlanData,
            licensingID: licensing.id,
          });
        }
      }
    } catch (error: any) {
      throw new BootstrapException(
        `Unable to create license plans ${error.message}`
      );
    }
  }

  @Profiling.api
  async createUserProfiles(usersData: any[]) {
    try {
      for (const userData of usersData) {
        const userExists = await this.userService.isRegisteredUser(
          userData.email
        );
        if (!userExists) {
          const user = await this.userService.createUser({
            email: userData.email,
            accountUpn: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileData: {
              displayName: `${userData.firstName} ${userData.lastName}`,
            },
          });

          // Once all is done, reset the user authorizations
          const userAuthorizations =
            await this.userAuthorizationService.applyAuthorizationPolicy(
              user.id
            );
          await this.authorizationPolicyService.saveAll(userAuthorizations);

          const account = await this.userService.getAccount(user);
          const accountAuthorizations =
            await this.accountAuthorizationService.applyAuthorizationPolicy(
              account
            );
          await this.authorizationPolicyService.saveAll(accountAuthorizations);

          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.adminAuthorizationService.grantCredentialToUser({
              userID: user.id,
              type: credentialData.type,
              resourceID: credentialData.resourceID,
            });
          }
          await this.userAuthorizationService.grantCredentialsAllUsersReceive(
            user.id
          );
        }
      }
    } catch (error: any) {
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
    }
  }

  // // TODO: NOT USED?????
  // private async ensureSpaceNamesInElastic() {
  //   const spaces = await this.spaceService.getAllSpaces({
  //     relations: {
  //       profile: {
  //         location: true,
  //       },
  //     },
  //   });

  //   const data = spaces.map(({ id, profile: { displayName: name } }) => ({
  //     id,
  //     name,
  //   }));

  //   this.nameReporter.bulkUpdateOrCreateNames(data);
  // }

  async ensureSsiPopulated() {
    const ssiEnabled = this.configService.get('ssi.enabled', { infer: true });
    if (ssiEnabled) {
      await this.agentService.ensureDidsCreated();
    }
  }

  private async ensureAuthorizationsPopulated() {
    // For platform
    const platform = await this.platformService.getPlatformOrFail();
    const platformAuthorization =
      this.authorizationPolicyService.validateAuthorization(
        platform.authorization
      );
    const platformCredentialRules =
      this.authorizationPolicyService.getCredentialRules(platformAuthorization);
    // Assume that zero rules means that the policy has not been reset
    if (platformCredentialRules.length == 0) {
      this.logger.verbose?.(
        '=== Identified that platform authorization had not been reset; resetting now ===',
        LogContext.BOOTSTRAP
      );
      const updatedAuthorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }

    // Also do same for AI Server until it is moved out of the server
    const aiServer = await this.aiServer.getAiServerOrFail();
    const aiServerAuthorization =
      this.authorizationPolicyService.validateAuthorization(
        aiServer.authorization
      );
    const aiServerCredentialRules =
      this.authorizationPolicyService.getCredentialRules(aiServerAuthorization);
    // Assume that zero rules means that the policy has not been reset
    if (aiServerCredentialRules.length == 0) {
      this.logger.verbose?.(
        '=== Identified that AI Server authorization had not been reset; resetting now ===',
        LogContext.BOOTSTRAP
      );
      const authorizations =
        await this.aiServerAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
    }
  }

  private async createSystemAgentInfo(user: IUser): Promise<AgentInfo> {
    return {
      userID: user.id,
      email: user.email,
      emailVerified: true,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarURL: '',
      credentials: user.agent?.credentials || [],
      agentID: user.agent?.id,
      verifiedCredentials: [],
      communicationID: user.communicationID,
    };
  }

  private async ensureOrganizationSingleton() {
    // create a default host org
    let hostOrganization = await this.organizationService.getOrganization(
      DEFAULT_HOST_ORG_NAMEID
    );
    if (!hostOrganization) {
      const adminAgentInfo = await this.getAdminAgentInfo();
      hostOrganization = await this.organizationService.createOrganization(
        {
          nameID: DEFAULT_HOST_ORG_NAMEID,
          profileData: {
            displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
          },
        },
        adminAgentInfo
      );
      const orgAuthorizations =
        await this.organizationAuthorizationService.applyAuthorizationPolicy(
          hostOrganization
        );
      await this.authorizationPolicyService.saveAll(orgAuthorizations);

      const account =
        await this.organizationService.getAccount(hostOrganization);
      const accountAuthorizations =
        await this.accountAuthorizationService.applyAuthorizationPolicy(
          account
        );
      await this.authorizationPolicyService.saveAll(accountAuthorizations);

      const accountEntitlements =
        await this.accountLicenseService.applyLicensePolicy(account.id);
      await this.licenseService.saveAll(accountEntitlements);
    }
  }

  private async getAdminAgentInfo(): Promise<AgentInfo> {
    const adminUserEmail = 'admin@alkem.io';
    const adminUser = await this.userService.getUserByEmail(adminUserEmail, {
      relations: {
        agent: true,
      },
    });
    if (!adminUser) {
      throw new BootstrapException(
        `Unable to load fixed admin user for creating organization: ${adminUserEmail}`
      );
    }
    return this.createSystemAgentInfo(adminUser);
  }

  private async ensureSpaceSingleton() {
    this.logger.verbose?.(
      '=== Ensuring at least one Account with a space is present ===',
      LogContext.BOOTSTRAP
    );
    const spaceCount = await this.spaceRepository.count();
    if (spaceCount == 0) {
      this.logger.verbose?.('...No space present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.(
        '........creating on default organization',
        LogContext.BOOTSTRAP
      );
      const hostOrganization =
        await this.organizationService.getOrganizationOrFail(
          DEFAULT_HOST_ORG_NAMEID
        );

      const account =
        await this.organizationService.getAccount(hostOrganization);
      const spaceInput: CreateSpaceOnAccountInput = {
        accountID: account.id,
        nameID: DEFAULT_SPACE_NAMEID,
        profileData: {
          displayName: DEFAULT_SPACE_DISPLAYNAME,
          tagline: 'An empty space to be populated',
        },
        level: SpaceLevel.SPACE,
        type: SpaceType.SPACE,
        collaborationData: {},
      };

      const space = await this.accountService.createSpaceOnAccount(spaceInput);
      const spaceAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
      await this.authorizationPolicyService.saveAll(spaceAuthorizations);

      const accountEntitlements =
        await this.accountLicenseService.applyLicensePolicy(account.id);
      await this.licenseService.saveAll(accountEntitlements);

      return this.spaceService.getSpaceOrFail(space.id);
    }
  }
}
