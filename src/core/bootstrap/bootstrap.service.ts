import {
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
  DEFAULT_SPACE_DISPLAYNAME,
  DEFAULT_SPACE_NAMEID,
} from '@common/constants';
import { Profiling } from '@common/decorators';
import { LogContext } from '@common/enums';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { RoleName } from '@common/enums/role.name';
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
import { ROLE_CREDENTIAL_MAP } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
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
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { PlatformService } from '@platform/platform/platform.service';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.service';
import {
  FEATURE_FAMILY_ROLES,
  PLATFORM_FAMILY_ROLES,
  PlatformRoleAssignmentRulesService,
} from '@platform/platform-role/platform.role.assignment.rules.service';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import { AdminAuthorizationService } from '@src/platform-admin/domain/authorization/admin.authorization.service';
import { resolveInitiatorRole } from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
import { PlatformRoleAssignmentAuditService } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
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
    // 027-platform-role-redesign (T053-T055): the shared assignment rule
    // engine and the (fail-open) role-assignment audit writer — seeded
    // grants go through the SAME enforcement point as the mutation path.
    private readonly platformRoleAssignmentRulesService: PlatformRoleAssignmentRulesService,
    private readonly platformRoleAssignmentAuditService: PlatformRoleAssignmentAuditService
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

  /**
   * 027-platform-role-redesign (T053-T055, research C7/D12; narrowed by
   * sec-server-18): the credential grant loop runs on EVERY start, for
   * EVERY configured account, but the RESTART-TIME re-grant of a MISSING
   * credential is scoped to the FR-013b break-glass recovery credential
   * (`platform-roles-admin`) only — see `grantSeededCredentials`'s doc
   * comment. A break-glass Roles Admin whose credential was revoked
   * out-of-band (or never granted, on an environment seeded before this
   * feature) is re-granted on the next restart, exactly as FR-013b's
   * "out-of-band lockout repaired by restart" requires. Every OTHER seeded
   * credential (`platform-spaces-reader`, legacy roles, …) is granted only
   * at FIRST creation of the account — an operator's deliberate revocation
   * of one of those is durable across restarts, not silently reverted.
   */
  async createUserProfiles(usersData: any[]) {
    try {
      for (const userData of usersData) {
        let user = await this.userService.getUserByEmail(userData.email, {
          relations: { credentials: true },
        });
        const isNewAccount = !user;

        if (!user) {
          const created = await this.userService.createUser({
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
              created.id
            );
          await this.authorizationPolicyService.saveAll(userAuthorizations);

          const account = await this.userService.getAccount(created);
          const accountAuthorizations =
            await this.accountAuthorizationService.applyAuthorizationPolicy(
              account
            );
          await this.authorizationPolicyService.saveAll(accountAuthorizations);

          await this.userAuthorizationService.grantCredentialsAllUsersReceive(
            created.id
          );

          // Reload with `credentials` populated for the grant loop below.
          user = await this.userService.getUserByEmail(userData.email, {
            relations: { credentials: true },
          });
        }

        if (!user) {
          throw new BootstrapException(
            'Unable to (re)load seeded user after creation',
            { userEmail: userData.email }
          );
        }

        // T055/corr-server-4: reconcile the seeded `serviceProfile` marker
        // for BOTH a freshly-created user AND a pre-existing one whose
        // marker is missing (e.g. a bootstrap run that crashed before the
        // marker was persisted, an out-of-band credential revoke, or an
        // account seeded before this feature). This MUST happen BEFORE
        // `grantSeededCredentials` evaluates rule 3 below, on EVERY restart
        // — not only at user-creation time — or a pre-existing account
        // without the marker makes `evaluateSeedOrFail` fail fatally and
        // the server refuses to start, on every subsequent restart, with no
        // way to repair it (inverting FR-013b's "out-of-band lockout
        // repaired by restart" into a permanent, restart-proof outage). Set
        // directly on the entity (not via `updateUser`) — bootstrap is a
        // system process, not a `SET_SERVICE_PROFILE`-gated mutation, and
        // the platform authorization policy carrying that privilege may not
        // even be populated yet at this point in `bootstrap()`
        // (`ensureAuthorizationsPopulated()` runs later).
        if (userData.serviceProfile === true && user.serviceProfile !== true) {
          user.serviceProfile = true;
          user = await this.userService.save(user);
        }

        await this.grantSeededCredentials(
          user,
          userData.credentials ?? [],
          isNewAccount
        );
      }
    } catch (error: any) {
      if (error instanceof BootstrapException) {
        throw error;
      }
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
    }
  }

  /**
   * T053/T054 — grants only the credentials `user` does not already hold
   * (idempotent across restarts), routing every credential that belongs to
   * the NEW target role vocabulary (`platform-*` / `feature-*`) through the
   * SAME `PlatformRoleAssignmentRulesService` the resolver mutation path
   * uses (T030-T032a) via `evaluateSeedOrFail()` — rules 2-5, never rule 1
   * (there is no assigner; see that method's doc comment). Legacy
   * credentials (`global-admin`, ...) are outside the rule engine's scope
   * in Slice A and are granted unconditionally, exactly as before.
   *
   * A rule violation is FATAL (`BootstrapException`, naming the account and
   * the violated rule) — never forced through by stripping the role, never
   * silently skipped (FR-013, FR-028). The audit write is FAIL-OPEN
   * (`seeded: true`, FR-027): the break-glass grant must not depend on a
   * healthy audit store.
   *
   * sec-server-18 fix: `isNewAccount` gates whether a MISSING credential is
   * restart-eligible. Only `platform-roles-admin` (the FR-013b break-glass
   * recovery role) is re-granted on a restart against a PRE-EXISTING
   * account — every other credential (`platform-spaces-reader`, legacy
   * roles, any other `Platform …`/`Feature …` role a future seed adds) is
   * granted only when the account is being created for the first time.
   * Before this fix, EVERY seeded credential of EVERY seeded account was
   * silently re-applied on every restart — an operator who deliberately
   * revoked, say, `platform-spaces-reader` from the seeded service account
   * found it reinstated on the next pod restart, with no way to make the
   * revocation durable through the product. FR-013b's "out-of-band lockout
   * repaired by restart" is a guarantee about break-glass ROLES ADMIN
   * recovery specifically (quickstart.md §5, T071) — not a blanket promise
   * that every seeded credential is unrevokable.
   */
  private async grantSeededCredentials(
    user: IUser,
    credentialsData: { type: AuthorizationCredential; resourceID?: string }[],
    isNewAccount: boolean
  ): Promise<void> {
    const alreadyHeld = new Set(
      (user.credentials ?? []).map(c => `${c.type}::${c.resourceID ?? ''}`)
    );

    // spec-server-3/qual-server-2 fix: rule 4 (Audit Reader mutual
    // exclusion) is otherwise INERT on this seed path — `evaluateSeedOrFail`
    // was called without `targetHeldPlatformRoles`, so it always read an
    // empty held-role set. Seed it from the user's EXISTING `Platform …`
    // credentials, then update it as each credential in THIS loop is
    // granted, so a single `users.json` entry listing two mutually
    // exclusive Platform roles (e.g. platform-audit-reader +
    // platform-support) on one account is caught even though neither is yet
    // persisted when the loop starts (FR-028).
    const heldPlatformRoles = new Set<RoleName>(
      (user.credentials ?? [])
        .map(c => c.type as unknown as RoleName)
        .filter(r => PLATFORM_FAMILY_ROLES.has(r))
    );

    for (const credentialData of credentialsData) {
      const key = `${credentialData.type}::${credentialData.resourceID ?? ''}`;
      if (alreadyHeld.has(key)) {
        continue;
      }

      // sec-server-18 fix: a MISSING credential is only restart-eligible
      // when the account is new OR the credential is the FR-013b
      // break-glass recovery role (`platform-roles-admin`). Every other
      // missing credential on a PRE-EXISTING account was deliberately
      // revoked (or never granted) and stays that way — no silent
      // reinstatement on the next restart.
      const isBreakGlassRecoveryCredential =
        credentialData.type === AuthorizationCredential.PLATFORM_ROLES_ADMIN;
      if (!isNewAccount && !isBreakGlassRecoveryCredential) {
        this.logger.verbose?.(
          `Bootstrap: seeded credential '${credentialData.type}' is missing on pre-existing account '${user.id}' — NOT auto-reinstating (durable revocation, sec-server-18)`,
          LogContext.BOOTSTRAP
        );
        continue;
      }

      // D2: identical strings for the new `platform-*`/`feature-*` roles —
      // the two enums are nominally distinct, so the cast goes via
      // `unknown`, exactly as `platform.roles.access.service.ts` documents.
      const asRole = credentialData.type as unknown as RoleName;
      const isTargetRoleModel =
        PLATFORM_FAMILY_ROLES.has(asRole) || FEATURE_FAMILY_ROLES.has(asRole);

      if (isTargetRoleModel) {
        try {
          this.platformRoleAssignmentRulesService.evaluateSeedOrFail({
            action: 'grant',
            role: asRole,
            targetActorType: 'user',
            targetServiceProfile: user.serviceProfile,
            targetHeldPlatformRoles: Array.from(heldPlatformRoles),
          });
        } catch (error: any) {
          throw new BootstrapException(
            `Seeded credential grant rejected: role ${asRole} violates ${
              error?.details?.ruleId ?? 'an assignment rule'
            }`,
            { userId: user.id, role: asRole, cause: error?.message }
          );
        }
      }

      await this.adminAuthorizationService.grantCredentialToUser({
        userID: user.id,
        type: credentialData.type,
        resourceID: credentialData.resourceID,
      });

      if (PLATFORM_FAMILY_ROLES.has(asRole)) {
        heldPlatformRoles.add(asRole);
      }

      if (isTargetRoleModel) {
        // FR-027: seeded writes fail OPEN — logged, never blocking startup.
        // No actor at all (bootstrap-seeded) — resolves to `system`
        // regardless of `intendedOwners` (T058a's second fallback case).
        const initiatorRole: PlatformAuditInitiatorRole = resolveInitiatorRole({
          intendedOwners: [ROLE_CREDENTIAL_MAP[asRole]],
        });
        await this.platformRoleAssignmentAuditService.recordGrantOrRevoke({
          initiatorRole,
          targetKind: 'user',
          targetId: user.id,
          role: asRole,
          outcome: 'granted',
          seeded: true,
        });
      }
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
