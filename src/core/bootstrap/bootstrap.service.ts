import {
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
  DEFAULT_SPACE_DISPLAYNAME,
  DEFAULT_SPACE_NAMEID,
} from '@common/constants';
import { Profiling } from '@common/decorators';
import { LogContext } from '@common/enums';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { RoleName } from '@common/enums/role.name';
import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceLevel } from '@common/enums/space.level';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualAssistant } from '@domain/community/virtual-assistant/virtual.assistant.interface';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';
import { Space } from '@domain/space/space/space.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';
import { TemplateDefaultService } from '@domain/template/template-default/template.default.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { PlatformService } from '@platform/platform/platform.service';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.service';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import { AdminAuthorizationService } from '@src/platform-admin/domain/authorization/admin.authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, Repository } from 'typeorm';
import { bootstrapClassificationTemplateDefinitions } from './platform-template-definitions/classification-templates/classification.template.definitions';
import { bootstrapTemplateSpaceContentCalloutsSpaceL0Tutorials } from './platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.space.l0.tutorials';
import { bootstrapTemplateSpaceContentCalloutsVcKnowledgeBase } from './platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.vc.knowledge.base';
import { bootstrapTemplateSpaceContentSpaceL0 } from './platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0';
import { bootstrapTemplateSpaceContentSubspace } from './platform-template-definitions/default-templates/bootstrap.template.space.content.subspace';
import * as defaultLicensePlan from './platform-template-definitions/license-plan/license-plans.json';
import * as defaultRoles from './platform-template-definitions/user/users.json';

@Injectable()
export class BootstrapService {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private actorContextService: ActorContextService,
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
    private readonly messagingService: MessagingService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private roleSetService: RoleSetService,
    private readonly virtualAssistantService: VirtualAssistantService,
    private readonly mcpApiKeyService: McpApiKeyService,
    private readonly innovationPackService: InnovationPackService,
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager
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

      const anonymousActorContext = this.actorContextService.createAnonymous();

      // Order matters:
      // 1. Infrastructure: Forum, Messaging
      // 2. Templates (needed for VC creation)
      // 3. Organization (created without admin first)
      // 4. Guidance VC (needs organization and templates)
      // 5. Users (including Admin) - will get guidance conversation created successfully
      // 6. Link Admin to Organization
      // 7. License plans
      // 8. Authorization policies
      // 9. Space

      await this.platformService.ensureForumCreated();
      await this.ensureMessagingCreated();
      await this.ensurePlatformTemplatesArePresent();

      // Create Org first (without admin if needed)
      await this.ensureOrganizationSingleton();

      // Classification Template defaults (SDGs, Language, Sector) need the
      // host organization's Account to exist, hence AFTER
      // ensureOrganizationSingleton — ensurePlatformTemplatesArePresent
      // above runs too early for this (research D-9).
      await this.ensureClassificationTemplatesArePresent();

      // Create VC (needs Org)
      await this.ensureGuidanceChat();

      // Create Users (including Admin)
      await this.bootstrapUserProfiles();

      // Ensure Admin is linked to Org
      await this.ensureAdminUserLinkedToOrganization();

      await this.bootstrapLicensePlans();
      await this.ensureAuthorizationsPopulated();
      // Register the virtual-assistant MCP trust-anchor key from the shared
      // ASSISTANT_MCP_API_KEY secret so delegated MCP works on a fresh deploy
      // with no manual DB surgery (issue #1937).
      await this.ensureAssistantMcpApiKey();
      await this.ensureSpaceSingleton(anonymousActorContext);
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

  /**
   * Ensure the `virtual-assistant` actor's MCP API key exists, derived from the
   * shared `ASSISTANT_MCP_API_KEY` secret (issue #1937). The assistant-service
   * sends this same plaintext as its delegation bearer; the server stores only
   * its SHA-256 hash, bound to the virtual-assistant actor. Idempotent (a no-op
   * once the row matches). Skipped — with a warning, never failing bootstrap —
   * when the secret is unset, malformed, or the actor is absent.
   */
  private async ensureAssistantMcpApiKey(): Promise<void> {
    const plaintext = process.env.ASSISTANT_MCP_API_KEY?.trim();
    if (!plaintext) {
      this.logger.warn?.(
        'ASSISTANT_MCP_API_KEY is not set — skipping virtual-assistant MCP key bootstrap; delegated MCP (the Web AI Assistant) is unavailable until it is provisioned',
        LogContext.BOOTSTRAP
      );
      return;
    }
    // The MCP API-key strategy only engages `Authorization: Bearer mcp_…`
    // headers, so a key without the prefix would bootstrap a row that can
    // never authenticate: every asvc call 401s while bootstrap logs success.
    if (!plaintext.startsWith('mcp_')) {
      this.logger.warn?.(
        "ASSISTANT_MCP_API_KEY does not start with 'mcp_' — skipping virtual-assistant MCP key bootstrap; the MCP host only accepts 'Bearer mcp_…' keys, so this key could never authenticate. Provision a key in the format mcp_<base64url(32)>",
        LogContext.BOOTSTRAP
      );
      return;
    }

    let virtualAssistant: IVirtualAssistant;
    try {
      virtualAssistant =
        await this.virtualAssistantService.getSingletonOrFail();
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        this.logger.warn?.(
          'virtual-assistant actor not found — skipping MCP key bootstrap (the actor is created by migration; ensure migrations have run)',
          LogContext.BOOTSTRAP
        );
        return;
      }
      // A transient/DB error must NOT masquerade as "actor absent" and silently
      // disable delegated MCP — surface it to bootstrap's error handler.
      throw error;
    }

    await this.mcpApiKeyService.ensureActorKeyFromPlaintext(
      virtualAssistant.id,
      plaintext,
      [{ operations: ['read', 'tools'] }]
    );
    this.logger.verbose?.(
      `Ensured virtual-assistant MCP API key from ASSISTANT_MCP_API_KEY (actor ${virtualAssistant.id})`,
      LogContext.BOOTSTRAP
    );
  }

  /**
   * Ensures the platform Messaging exists.
   * Creates it if missing (should happen only on fresh deployments).
   */
  private async ensureMessagingCreated(): Promise<void> {
    const messaging = await this.platformService.ensureMessagingCreated();
    this.logger.verbose?.(
      `Platform Messaging ensured: ${messaging.id}`,
      LogContext.BOOTSTRAP
    );
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

  private async ensureOrganizationSingleton(actorContext?: ActorContext) {
    // create a default host org
    let hostOrganization =
      await this.organizationLookupService.getOrganizationByNameId(
        DEFAULT_HOST_ORG_NAMEID
      );
    if (!hostOrganization) {
      // If actorContext is not provided, we create without an admin initially
      // The admin will be linked later
      hostOrganization = await this.organizationService.createOrganization(
        {
          nameID: DEFAULT_HOST_ORG_NAMEID,
          profileData: {
            displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
          },
        },
        actorContext
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

  // The name-id this feature's seed is create-if-absent keyed on, WITHIN
  // this dedicated pack alone (never any other pack — spec §Session
  // 2026-08-11, "the platform Template Pack").
  private static readonly CLASSIFICATION_PACK_NAME_ID =
    'platform-classifications';

  /**
   * Ensures the dedicated platform Classification Template pack (SDGs,
   * Language, Sector) exists, with all three operator-mandated fixes:
   *
   * (1) A `pg_advisory_xact_lock` held for the whole ensure step, so the
   *     6-pod parallel-bootstrap race can't create the pack or a template
   *     twice. Serialization, not atomicity, is the goal — the create-if-
   *     absent calls below use their own auto-committing connections, so
   *     each one is visible to the NEXT lock-holder before this transaction
   *     releases the lock (precedent: messaging.service.ts's dedup lock).
   * (2) `createInnovationPack` hardcodes `searchVisibility: ACCOUNT` on the
   *     create path and ignores any supplied value (`innovation.pack.
   *     service.ts` — the input-honouring path is a separate `update()`), so
   *     the pack is forced `PUBLIC` explicitly, every time, after any
   *     create-or-fix-up — the picker (`library.service.ts`) requires it.
   * (3) When this run created the pack or any template, OR an already-
   *     seeded CLASSIFICATION template is found carrying an empty
   *     `credentialRules` (a stale policy left behind by a prior bootstrap
   *     run that predates this reset, or one that raced past it), the
   *     seed's OWN scoped authorization reset runs — re-applying the host
   *     organization's Account policy, which cascades down through every
   *     owned InnovationPack's templatesSet and templates.
   *     `ensureAuthorizationsPopulated` only fires when the PLATFORM policy
   *     has zero rules, true on a fresh DB but false on every real deploy,
   *     so without this the seeded pack's policies stay empty in
   *     production. Gating the reset on "created something" alone is NOT
   *     enough: an install that seeded its templates once with the reset
   *     broken (or skipped) stays permanently broken across every later
   *     restart, since nothing is ever created again — the empty-
   *     credentialRules check is what makes this self-healing on the
   *     already-seeded / upgrade path, not just the fresh-install path.
   *
   * Never modifies, overwrites, or restores an existing or admin-deleted
   * template — create-if-absent, matched by nameID within this pack alone.
   * "Admin-deleted" is distinguished from "never created" by the pack's own
   * `deletedSeedTemplateNameIDs` tombstone, written by TemplateService.delete
   * at the moment a seeded template is removed.
   */
  private async ensureClassificationTemplatesArePresent(): Promise<void> {
    const { createdSomething, staleAuthFound } =
      await this.entityManager.transaction(async manager => {
        // Fix 1 — held for the duration of this callback; released when the
        // outer transaction commits on return.
        await manager.query(
          "SELECT pg_advisory_xact_lock(hashtext('bootstrap:classification-templates'))"
        );

        let created = false;
        let pack = await this.getClassificationPackIfExists();

        if (!pack) {
          const hostOrganization =
            await this.organizationLookupService.getOrganizationByNameIdOrFail(
              DEFAULT_HOST_ORG_NAMEID
            );
          const account =
            await this.organizationService.getAccount(hostOrganization);
          pack = await this.accountService.createInnovationPackOnAccount({
            accountID: account.id,
            nameID: BootstrapService.CLASSIFICATION_PACK_NAME_ID,
            profileData: {
              displayName: 'Classifications',
              description:
                'Platform default Classification Templates (SDGs, Language, Sector).',
            },
          });
          created = true;
        }

        // Fix 2 — unconditional: even a pre-existing pack from a partially
        // completed earlier run is forced PUBLIC here, every time.
        if (
          pack.searchVisibility !== SearchVisibility.PUBLIC ||
          !pack.listedInStore
        ) {
          pack.searchVisibility = SearchVisibility.PUBLIC;
          pack.listedInStore = true;
          pack = await this.innovationPackService.save(pack);
        }

        const templatesSet =
          await this.innovationPackService.getTemplatesSetOrFail(pack.id);
        const existingClassificationTemplates =
          await this.templatesSetService.getTemplatesOfType(
            templatesSet,
            TemplateType.CLASSIFICATION
          );
        const existingNameIDs = new Set(
          existingClassificationTemplates.map(template => template.nameID)
        );
        // A platform admin may delete a seeded template (it is an ordinary
        // community-editable one); the next bootstrap run MUST NOT
        // re-create it. TemplateService.delete writes the tombstone at
        // delete time (recordSeedTemplateDeletionIfInAnInnovationPack).
        const deletedNameIDs = new Set(pack.deletedSeedTemplateNameIDs ?? []);
        // Self-heal detector: the `authorization` relation is eager on
        // AuthorizableEntity, so every template returned above already
        // carries its policy row — no extra query needed.
        const staleAuthFound = existingClassificationTemplates.some(
          template =>
            (template.authorization?.credentialRules?.length ?? 0) === 0
        );

        for (const definition of bootstrapClassificationTemplateDefinitions) {
          if (existingNameIDs.has(definition.nameID)) {
            continue;
          }
          if (deletedNameIDs.has(definition.nameID)) {
            // Never restored — an admin-deleted default stays deleted.
            continue;
          }
          await this.templatesSetService.createTemplate(templatesSet, {
            nameID: definition.nameID,
            profileData: {
              displayName: definition.displayName,
              description: definition.description,
            },
            type: TemplateType.CLASSIFICATION,
            classificationData: {
              cardinality: definition.cardinality,
              values: definition.values,
            },
          });
          created = true;
        }

        return { createdSomething: created, staleAuthFound };
      });

    if (!createdSomething && !staleAuthFound) {
      return;
    }

    this.logger.verbose?.(
      createdSomething
        ? "=== Classification Template defaults were (re)created; running the seed's own scoped authorization reset ==="
        : '=== Classification Templates already present but carrying empty credentialRules from a prior bootstrap; running the scoped authorization reset to self-heal ===',
      LogContext.BOOTSTRAP
    );
    // Fix 3 — scoped to the host organization's Account (the pack's policy
    // parent), NOT a platform-wide reset (council systems-architect:OQ-3 —
    // never seed authorization rules in SQL, and never reach for
    // authorizationPolicyResetOnPlatform, which never reaches SpaceAbout
    // trees at all).
    const hostOrganization =
      await this.organizationLookupService.getOrganizationByNameIdOrFail(
        DEFAULT_HOST_ORG_NAMEID
      );
    const account = await this.organizationService.getAccount(hostOrganization);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(accountAuthorizations);
  }

  private async getClassificationPackIfExists(): Promise<
    IInnovationPack | undefined
  > {
    try {
      return await this.innovationPackService.getInnovationPackByNameIdOrFail(
        BootstrapService.CLASSIFICATION_PACK_NAME_ID
      );
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        return undefined;
      }
      throw error;
    }
  }

  private async ensureAdminUserLinkedToOrganization() {
    const adminActorContext = await this.getAdminActorContext();
    const hostOrganization =
      await this.organizationLookupService.getOrganizationByNameIdOrFail(
        DEFAULT_HOST_ORG_NAMEID
      );

    const roleSet = await this.organizationService.getRoleSet(hostOrganization);

    // Assign Admin as Associate and Admin
    await this.roleSetService.assignActorToRole(
      roleSet,
      RoleName.ASSOCIATE,
      adminActorContext.actorID,
      adminActorContext,
      false
    );

    await this.roleSetService.assignActorToRole(
      roleSet,
      RoleName.ADMIN,
      adminActorContext.actorID,
      adminActorContext,
      false
    );

    this.logger.verbose?.(
      `Ensured Admin user linked to Organization: ${hostOrganization.id}`,
      LogContext.BOOTSTRAP
    );
  }

  private async getAdminActorContext(): Promise<ActorContext> {
    const adminUserEmail = 'admin@alkem.io';
    const adminUser = await this.userService.getUserByEmail(adminUserEmail, {
      relations: {
        credentials: true,
      },
    });
    if (!adminUser) {
      throw new BootstrapException(
        `Unable to load fixed admin user for creating organization: ${adminUserEmail}`
      );
    }
    const ctx = new ActorContext();
    ctx.actorID = adminUser.id;
    ctx.isAnonymous = false;
    ctx.credentials = (adminUser.credentials || []).map(c => ({
      type: c.type,
      resourceID: c.resourceID,
    }));
    ctx.authenticationID = adminUser.authenticationID ?? undefined;
    return ctx;
  }

  private async ensureSpaceSingleton(actorContext: ActorContext) {
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
        actorContext
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

      // Apply authorization for the newly created VC via account auth reset
      // (the earlier account auth reset in ensureOrganizationSingleton ran before
      // this VC existed, so it was skipped)
      const accountAuthorizations =
        await this.accountAuthorizationService.applyAuthorizationPolicy(
          account
        );
      await this.authorizationPolicyService.saveAll(accountAuthorizations);

      // Register the VC as the CHAT_GUIDANCE well-known VC
      await this.platformWellKnownVirtualContributorsService.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        vc.id
      );
    }
  }
}
