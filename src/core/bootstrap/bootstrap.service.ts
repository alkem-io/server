import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SpaceService } from '@domain/space/space/space.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorization-bootstrap.json';
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
import { PlatformService } from '@platform/platfrom/platform.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationService } from '@platform/platfrom/platform.service.authorization';
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

@Injectable()
export class BootstrapService {
  private adminAgentInfo?: AgentInfo;

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
    private templateDefaultService: TemplateDefaultService
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
      await this.ensureAuthorizationsPopulated();
      await this.ensurePlatformTemplatesArePresent();
      await this.ensureOrganizationSingleton();
      await this.ensureSpaceSingleton();
      await this.ensureSsiPopulated();
      await this.platformService.ensureForumCreated();
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
      authResetNeeded ||
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
        templatesSet,
        'space',
        bootstrapSpaceTutorialsInnovationFlowStates,
        bootstrapSpaceTutorialsCalloutGroups,
        bootstrapSpaceTutorialsCallouts
      ));
    authResetNeeded =
      authResetNeeded ||
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
        templatesSet,
        'knowledge',
        bootstrapSubspaceKnowledgeInnovationFlowStates,
        bootstrapSubspaceKnowledgeCalloutGroups,
        bootstrapSubspaceKnowledgeCallouts
      ));
    authResetNeeded =
      authResetNeeded ||
      (await this.ensureSubspaceKnowledgeTemplatesArePresent(
        templateDefaults,
        TemplateDefaultType.PLATFORM_SUBSPACE,
        templatesSet,
        'challenge',
        bootstrapSubspaceInnovationFlowStates,
        bootstrapSubspaceCalloutGroups,
        bootstrapSubspaceCallouts
      ));
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
    const bootstrapAuthorizationEnabled = this.configService.get(
      'bootstrap.authorization.enabled',
      { infer: true }
    );
    if (!bootstrapAuthorizationEnabled) {
      this.logger.verbose?.(
        `Authorization Profile Loading: ${bootstrapAuthorizationEnabled}`,
        LogContext.BOOTSTRAP
      );
      return;
    }

    const bootstrapFilePath = this.configService.get(
      'bootstrap.authorization.file',
      { infer: true }
    );

    let bootstrapJson = {
      ...defaultRoles,
    };

    if (
      bootstrapFilePath &&
      fs.existsSync(bootstrapFilePath) &&
      fs.statSync(bootstrapFilePath).isFile()
    ) {
      this.logger.verbose?.(
        `Authorization bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContext.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose?.(bootstratDataStr);
      if (!bootstratDataStr) {
        throw new BootstrapException(
          'Specified authorization bootstrap file not found!'
        );
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose?.(
        'Authorization bootstrap: default configuration being loaded',
        LogContext.BOOTSTRAP
      );
    }

    const users = bootstrapJson.users;
    if (!users) {
      this.logger.verbose?.(
        'No users section in the authorization bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(users);
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
          let user = await this.userService.createUser({
            email: userData.email,
            accountUpn: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileData: {
              displayName: `${userData.firstName} ${userData.lastName}`,
            },
          });

          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.adminAuthorizationService.grantCredentialToUser({
              userID: user.id,
              type: credentialData.type,
              resourceID: credentialData.resourceID,
            });
          }
          user = await this.userAuthorizationService.grantCredentials(user);

          // Once all is done, reset the user authorizations
          const userAuthorizations =
            await this.userAuthorizationService.applyAuthorizationPolicy(user);
          await this.authorizationPolicyService.saveAll(userAuthorizations);

          const account = await this.userService.getAccount(user);
          const accountAuthorizations =
            await this.accountAuthorizationService.applyAuthorizationPolicy(
              account
            );
          await this.authorizationPolicyService.saveAll(accountAuthorizations);
          if (!this.adminAgentInfo) {
            this.adminAgentInfo = await this.createSystemAgentInfo(user);
          }
        } else {
          if (!this.adminAgentInfo) {
            const user = await this.userService.getUserByEmail(userData.email);
            if (user) {
              this.adminAgentInfo = await this.createSystemAgentInfo(user);
            }
          }
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
      hostOrganization = await this.organizationService.createOrganization(
        {
          nameID: DEFAULT_HOST_ORG_NAMEID,
          profileData: {
            displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
          },
        },
        this.adminAgentInfo
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
    }
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

      return this.spaceService.getSpaceOrFail(space.id);
    }
  }
}
