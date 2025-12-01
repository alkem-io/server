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
import { PlatformService } from '@platform/platform/platform.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { Space } from '@domain/space/space/space.entity';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { TemplateDefaultService } from '@domain/template/template-default/template.default.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { LicenseService } from '@domain/common/license/license.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';
import { bootstrapTemplateSpaceContentSpaceL0 } from './platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0';
import { bootstrapTemplateSpaceContentSubspace } from './platform-template-definitions/default-templates/bootstrap.template.space.content.subspace';
import { bootstrapTemplateSpaceContentCalloutsSpaceL0Tutorials } from './platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.space.l0.tutorials';
import { bootstrapTemplateSpaceContentCalloutsVcKnowledgeBase } from './platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.vc.knowledge.base';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AdminAuthorizationService } from '@src/platform-admin/domain/authorization/admin.authorization.service';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { ConversationsSetService } from '@domain/communication/conversations-set/conversations.set.service';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.service';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private agentService: AgentService,
    private agentInfoService: AgentInfoService,
    private spaceService: SpaceService,
    private userService: UserService,
    private userLookupService: UserLookupService,
    private userAuthorizationService: UserAuthorizationService,
    private organizationService: OrganizationService,
    private organizationLookupService: OrganizationLookupService,
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
    private templatesSetService: TemplatesSetService,
    private templateDefaultService: TemplateDefaultService,
    private platformTemplatesService: PlatformTemplatesService,
    private accountLicenseService: AccountLicenseService,
    private licenseService: LicenseService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licensePlanService: LicensePlanService,
    private conversationsSetService: ConversationsSetService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService
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

      const anonymousAgentInfo =
        this.agentInfoService.createAnonymousAgentInfo();

      await this.bootstrapUserProfiles();
      await this.bootstrapLicensePlans();
      await this.platformService.ensureForumCreated();
      await this.ensureAuthorizationsPopulated();
      await this.ensurePlatformTemplatesArePresent();
      await this.ensureOrganizationSingleton();
      await this.ensureSpaceSingleton(anonymousAgentInfo);
      await this.ensureGuidanceChat();
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
    let authResetNeeded = await this.ensureSpaceTemplateIsPresent(
      TemplateDefaultType.PLATFORM_SPACE,
      'space',
      bootstrapTemplateSpaceContentSpaceL0
    );
    authResetNeeded =
      (await this.ensureSpaceTemplateIsPresent(
        TemplateDefaultType.PLATFORM_SUBSPACE,
        'subspace',
        bootstrapTemplateSpaceContentSubspace
      )) || authResetNeeded;
    authResetNeeded =
      (await this.ensureSpaceTemplateIsPresent(
        TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
        'space-tutorials',
        bootstrapTemplateSpaceContentCalloutsSpaceL0Tutorials
      )) || authResetNeeded;
    authResetNeeded =
      (await this.ensureSpaceTemplateIsPresent(
        TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
        'knowledge',
        bootstrapTemplateSpaceContentCalloutsVcKnowledgeBase
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

  private async ensureSpaceTemplateIsPresent(
    templateDefaultType: TemplateDefaultType,
    nameID: string,
    spaceContentData: CreateTemplateContentSpaceInput
  ): Promise<boolean> {
    const templatesSet =
      await this.platformTemplatesService.getPlatformTemplatesSet();
    const templateDefault =
      await this.platformTemplatesService.getPlatformTemplateDefault(
        templateDefaultType
      );

    if (!templateDefault) {
      throw new BootstrapException(
        `Unable to load Template Default for ${templateDefaultType}`
      );
    }
    if (!templateDefault.template) {
      this.logger.verbose?.(
        `No template set for ${templateDefaultType}, setting it...`,
        LogContext.BOOTSTRAP
      );
      // No template set, so create one and then set it
      const template = await this.templatesSetService.createTemplate(
        templatesSet,
        {
          profileData: {
            displayName: `${nameID}-Template`,
          },
          type: TemplateType.SPACE,
          contentSpaceData: spaceContentData,
        }
      );
      // Set the default template
      templateDefault.template = template;
      await this.templateDefaultService.save(templateDefault);
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

  async createUserProfiles(usersData: any[]) {
    try {
      for (const userData of usersData) {
        const userExists = await this.userLookupService.isRegisteredUser(
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

  private async ensureOrganizationSingleton() {
    // create a default host org
    let hostOrganization =
      await this.organizationLookupService.getOrganizationByNameId(
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
    return {
      isAnonymous: false,
      userID: adminUser.id,
      email: adminUser.email,
      emailVerified: true,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      guestName: '',
      avatarURL: '',
      credentials: adminUser.agent?.credentials || [],
      agentID: adminUser.agent?.id,
      verifiedCredentials: [],
      communicationID: adminUser.communicationID,
    };
  }

  private async ensureSpaceSingleton(agentInfo: AgentInfo) {
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
        await this.organizationLookupService.getOrganizationByNameIdOrFail(
          DEFAULT_HOST_ORG_NAMEID
        );

      const account =
        await this.organizationService.getAccount(hostOrganization);
      const spaceInput: CreateSpaceOnAccountInput = {
        accountID: account.id,
        nameID: DEFAULT_SPACE_NAMEID,
        about: {
          profileData: {
            displayName: DEFAULT_SPACE_DISPLAYNAME,
            tagline: 'An empty space to be populated',
          },
        },
        level: SpaceLevel.L0,
        levelZeroSpaceID: '',
        collaborationData: {
          calloutsSetData: {},
        },
      };

      const space = await this.accountService.createSpaceOnAccount(
        spaceInput,
        agentInfo
      );
      const spaceAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      await this.authorizationPolicyService.saveAll(spaceAuthorizations);

      const accountEntitlements =
        await this.accountLicenseService.applyLicensePolicy(account.id);
      await this.licenseService.saveAll(accountEntitlements);

      return this.spaceService.getSpaceOrFail(space.id);
    }
  }

  private async ensureGuidanceChat() {
    // Check if the CHAT_GUIDANCE well-known VC is configured
    const wellKnownVCId =
      await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

    if (!wellKnownVCId) {
      // Get admin account:
      const hostOrganization =
        await this.organizationLookupService.getOrganizationByNameIdOrFail(
          DEFAULT_HOST_ORG_NAMEID
        );
      const account =
        await this.organizationService.getAccount(hostOrganization);

      // Create the VC
      const vc = await this.accountService.createVirtualContributorOnAccount({
        accountID: account.id,
        aiPersona: {
          engine: AiPersonaEngine.GUIDANCE,
          prompt: [],
          externalConfig: undefined,
        },
        profileData: {
          displayName: 'Guidance',
          description: 'Guidance Virtual Contributor',
        },
        dataAccessMode: VirtualContributorDataAccessMode.NONE,
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.WEBSITE,
        interactionModes: [
          VirtualContributorInteractionMode.DISCUSSION_TAGGING,
        ],
        knowledgeBaseData: {
          profile: {
            displayName: 'Knowledge Base for Virtual Contributor',
          },
          calloutsSetData: {},
        },
      });

      // Register the VC as the CHAT_GUIDANCE well-known VC
      await this.platformWellKnownVirtualContributorsService.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        vc.id
      );
    }
  }
}
