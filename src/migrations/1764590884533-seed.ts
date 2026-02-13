import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed migration for PostgreSQL baseline.
 * This migration creates the initial platform data required for Alkemio to bootstrap.
 * It only runs if the platform table is empty (fresh install).
 *
 * Creates:
 * - Platform singleton with settings and wellKnownVirtualContributors
 * - Library
 * - Storage Aggregator with direct storage bucket
 * - Licensing Framework with License Policy
 * - Templates Manager with Templates Set and Template Defaults
 * - RoleSet for platform roles
 * - AI Server
 */
export class Seed1764590884533 implements MigrationInterface {
  name = 'Seed1764590884533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if platform already exists (not a fresh install)
    const platformExists = await queryRunner.query(
      `SELECT COUNT(*) as count FROM platform`
    );
    if (platformExists[0].count > 0) {
      console.log('Platform already exists, skipping seed migration');
      return;
    }

    console.log('Seeding initial platform data...');
    await this.initializePlatform(queryRunner);
    await this.initializeAiServer(queryRunner);
    console.log('Seed migration completed successfully');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This seed data should not be removed
    console.log('Seed migration down - no action taken (seed data preserved)');
  }

  private async initializePlatform(queryRunner: QueryRunner): Promise<void> {
    // Create Library
    const libraryID = await this.initializeLibrary(queryRunner);

    // Create Storage Aggregator for platform
    const platformStorageAggregatorID =
      await this.createStorageAggregator(queryRunner);

    // Create Licensing Framework
    const licensingFrameworkID =
      await this.initializePlatformLicensing(queryRunner);

    // Create Templates Manager
    const templatesManagerID =
      await this.initializePlatformTemplatesManager(queryRunner);

    // Create RoleSet for platform roles
    const roleSetID = await this.createPlatformRoleSet(queryRunner);

    // Create Platform Authorization Policy
    const platformAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'platform')`,
      [platformAuthID]
    );

    // Create Platform with default settings
    const platformID = randomUUID();
    const platformSettings = JSON.stringify({
      integration: {
        iframeAllowedUrls: [],
        notificationEmailBlacklist: [],
      },
    });
    const wellKnownVirtualContributors = JSON.stringify({
      mappings: [],
    });

    await queryRunner.query(
      `INSERT INTO platform (id, "createdDate", "updatedDate", version, settings, "wellKnownVirtualContributors", "authorizationId", "libraryId", "storageAggregatorId", "licensingFrameworkId", "templatesManagerId", "roleSetId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        platformID,
        platformSettings,
        wellKnownVirtualContributors,
        platformAuthID,
        libraryID,
        platformStorageAggregatorID,
        licensingFrameworkID,
        templatesManagerID,
        roleSetID,
      ]
    );
  }

  private async initializeLibrary(queryRunner: QueryRunner): Promise<string> {
    const libraryAuthID = randomUUID();
    const libraryID = randomUUID();

    // Create authorization policy for library
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'library')`,
      [libraryAuthID]
    );

    // Create library
    await queryRunner.query(
      `INSERT INTO library (id, "createdDate", "updatedDate", version, "authorizationId")
       VALUES ($1, NOW(), NOW(), 1, $2)`,
      [libraryID, libraryAuthID]
    );

    return libraryID;
  }

  private async initializePlatformLicensing(
    queryRunner: QueryRunner
  ): Promise<string> {
    // Create License Policy
    const licensePolicyID = randomUUID();
    const licensePolicyAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'license-policy')`,
      [licensePolicyAuthID]
    );

    await queryRunner.query(
      `INSERT INTO license_policy (id, "createdDate", "updatedDate", version, "authorizationId", "credentialRules")
       VALUES ($1, NOW(), NOW(), 1, $2, $3)`,
      [
        licensePolicyID,
        licensePolicyAuthID,
        JSON.stringify(licenseCredentialRules),
      ]
    );

    // Create Licensing Framework
    const licensingFrameworkID = randomUUID();
    const licensingFrameworkAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'licensing-framework')`,
      [licensingFrameworkAuthID]
    );

    await queryRunner.query(
      `INSERT INTO licensing_framework (id, "createdDate", "updatedDate", version, "authorizationId", "licensePolicyId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3)`,
      [licensingFrameworkID, licensingFrameworkAuthID, licensePolicyID]
    );

    return licensingFrameworkID;
  }

  private async initializePlatformTemplatesManager(
    queryRunner: QueryRunner
  ): Promise<string> {
    // Create Templates Set first
    const templatesSetID = await this.createTemplatesSet(queryRunner);

    // Create Templates Manager
    const templatesManagerID = randomUUID();
    const templatesManagerAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'templates-manager')`,
      [templatesManagerAuthID]
    );

    await queryRunner.query(
      `INSERT INTO templates_manager (id, "createdDate", "updatedDate", version, "authorizationId", "templatesSetId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3)`,
      [templatesManagerID, templatesManagerAuthID, templatesSetID]
    );

    // Create Template Defaults for platform templates
    await this.createTemplateDefault(
      queryRunner,
      templatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      templatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      templatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      templatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
      TemplateType.COLLABORATION
    );

    return templatesManagerID;
  }

  private async createTemplatesSet(queryRunner: QueryRunner): Promise<string> {
    const templatesSetID = randomUUID();
    const templatesSetAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'templates-set')`,
      [templatesSetAuthID]
    );

    await queryRunner.query(
      `INSERT INTO templates_set (id, "createdDate", "updatedDate", version, "authorizationId")
       VALUES ($1, NOW(), NOW(), 1, $2)`,
      [templatesSetID, templatesSetAuthID]
    );

    return templatesSetID;
  }

  private async createTemplateDefault(
    queryRunner: QueryRunner,
    templatesManagerID: string,
    templateDefaultType: TemplateDefaultType,
    allowedTemplateType: TemplateType
  ): Promise<string> {
    const templateDefaultID = randomUUID();
    const templateDefaultAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'template-default')`,
      [templateDefaultAuthID]
    );

    await queryRunner.query(
      `INSERT INTO template_default (id, "createdDate", "updatedDate", version, type, "allowedTemplateType", "authorizationId", "templatesManagerId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5)`,
      [
        templateDefaultID,
        templateDefaultType,
        allowedTemplateType,
        templateDefaultAuthID,
        templatesManagerID,
      ]
    );

    return templateDefaultID;
  }

  private async createStorageAggregator(
    queryRunner: QueryRunner
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();
    const directStorageID = randomUUID();
    const directStorageAuthID = randomUUID();

    // Create auth for storage aggregator
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-aggregator')`,
      [storageAggregatorAuthID]
    );

    // Create auth for direct storage bucket
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-bucket')`,
      [directStorageAuthID]
    );

    // Create storage aggregator (without directStorageId initially due to circular reference)
    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, "createdDate", "updatedDate", version, "authorizationId", type)
       VALUES ($1, NOW(), NOW(), 1, $2, 'platform')`,
      [storageAggregatorID, storageAggregatorAuthID]
    );

    // Create direct storage bucket
    await queryRunner.query(
      `INSERT INTO storage_bucket (id, "createdDate", "updatedDate", version, "authorizationId", "allowedMimeTypes", "maxFileSize", "storageAggregatorId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5)`,
      [
        directStorageID,
        directStorageAuthID,
        allowedTypes.join(','),
        maxAllowedFileSize,
        storageAggregatorID,
      ]
    );

    // Update storage aggregator with direct storage reference
    await queryRunner.query(
      `UPDATE storage_aggregator SET "directStorageId" = $1 WHERE id = $2`,
      [directStorageID, storageAggregatorID]
    );

    return storageAggregatorID;
  }

  private async createPlatformRoleSet(
    queryRunner: QueryRunner
  ): Promise<string> {
    const roleSetID = randomUUID();
    const roleSetAuthID = randomUUID();
    const licenseID = randomUUID();
    const applicationFormID = randomUUID();

    // Create authorization policy for role set
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'role-set')`,
      [roleSetAuthID]
    );

    // Create license for role set
    const licenseAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'license')`,
      [licenseAuthID]
    );

    await queryRunner.query(
      `INSERT INTO license (id, "createdDate", "updatedDate", version, type, "authorizationId")
       VALUES ($1, NOW(), NOW(), 1, 'role-set', $2)`,
      [licenseID, licenseAuthID]
    );

    // Create application form for role set
    await queryRunner.query(
      `INSERT INTO form (id, "createdDate", "updatedDate", version, questions, description)
       VALUES ($1, NOW(), NOW(), 1, '[]', '')`,
      [applicationFormID]
    );

    // Create role set with required fields: entryRoleName and type
    // entryRoleName should match RoleName enum value: 'registered' (not 'global-registered')
    await queryRunner.query(
      `INSERT INTO role_set (id, "createdDate", "updatedDate", version, "entryRoleName", type, "authorizationId", "licenseId", "applicationFormId", "parentRoleSetId")
       VALUES ($1, NOW(), NOW(), 1, 'registered', 'platform', $2, $3, $4, NULL)`,
      [roleSetID, roleSetAuthID, licenseID, applicationFormID]
    );

    // Create platform roles
    await this.createPlatformRoles(queryRunner, roleSetID);

    return roleSetID;
  }

  private async createPlatformRoles(
    queryRunner: QueryRunner,
    roleSetID: string
  ): Promise<void> {
    const roles = [
      {
        name: 'global-admin',
        credential: { type: 'global-admin', resourceID: '' },
        userPolicy: { minimum: 1, maximum: -1 },
      },
      {
        name: 'global-support',
        credential: { type: 'global-support', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'global-license-manager',
        credential: { type: 'global-license-manager', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'global-spaces-reader',
        credential: { type: 'global-spaces-reader', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'platform-beta-tester',
        credential: { type: 'beta-tester', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'platform-vc-campaign',
        credential: { type: 'vc-campaign', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'global-community-reader',
        credential: { type: 'global-community-reader', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'registered',
        credential: { type: 'global-registered', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'global-platform-manager',
        credential: { type: 'global-platform-manager', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
      {
        name: 'global-support-manager',
        credential: { type: 'global-support-manager', resourceID: '' },
        userPolicy: { minimum: 0, maximum: -1 },
      },
    ];

    for (const role of roles) {
      const roleID = randomUUID();
      await queryRunner.query(
        `INSERT INTO role (id, "createdDate", "updatedDate", version, "roleSetId", name, credential, "parentCredentials", "requiresEntryRole", "requiresSameRoleInParentRoleSet", "userPolicy", "organizationPolicy", "virtualContributorPolicy")
         VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, '[]', false, false, $5, '{"minimum": 0, "maximum": 0}', '{"minimum": 0, "maximum": 0}')`,
        [
          roleID,
          roleSetID,
          role.name,
          JSON.stringify(role.credential),
          JSON.stringify(role.userPolicy),
        ]
      );
    }
  }

  private async initializeAiServer(queryRunner: QueryRunner): Promise<void> {
    // Check if AI server already exists
    const aiServerExists = await queryRunner.query(
      `SELECT COUNT(*) as count FROM ai_server`
    );
    if (aiServerExists[0].count > 0) {
      console.log('AI Server already exists, skipping');
      return;
    }

    const aiServerID = randomUUID();
    const aiServerAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'ai-server')`,
      [aiServerAuthID]
    );

    await queryRunner.query(
      `INSERT INTO ai_server (id, "createdDate", "updatedDate", version, "authorizationId")
       VALUES ($1, NOW(), NOW(), 1, $2)`,
      [aiServerID, aiServerAuthID]
    );
  }
}

// Constants and types

const allowedTypes = [
  'image/png',
  'image/x-png',
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const maxAllowedFileSize = 5242880;

type CredentialRule = {
  id: string;
  credentialType: LicensingCredentialBasedCredentialType;
  grantedEntitlements: { type: LicenseEntitlementType; limit: number }[];
  name: string;
};

enum LicensingCredentialBasedCredentialType {
  SPACE_FEATURE_VIRTUAL_CONTRIBUTORS = 'space-feature-virtual-contributors',
  SPACE_FEATURE_WHITEBOARD_MULTI_USER = 'space-feature-whiteboard-multi-user',
  SPACE_FEATURE_SAVE_AS_TEMPLATE = 'space-feature-save-as-template',
  SPACE_FEATURE_MEMO_MULTI_USER = 'space-feature-memo-multi-user',
  SPACE_LICENSE_FREE = 'space-license-free',
  SPACE_LICENSE_PLUS = 'space-license-plus',
  SPACE_LICENSE_PREMIUM = 'space-license-premium',
  ACCOUNT_LICENSE_FREE = 'account-license-free',
  ACCOUNT_LICENSE_PLUS = 'account-license-plus',
}

enum LicenseEntitlementType {
  ACCOUNT_SPACE_FREE = 'account-space-free',
  ACCOUNT_SPACE_PLUS = 'account-space-plus',
  ACCOUNT_SPACE_PREMIUM = 'account-space-premium',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'account-virtual-contributor',
  ACCOUNT_INNOVATION_PACK = 'account-innovation-pack',
  ACCOUNT_INNOVATION_HUB = 'account-innovation-hub',
  SPACE_FREE = 'space-free',
  SPACE_PLUS = 'space-plus',
  SPACE_PREMIUM = 'space-premium',
  SPACE_FLAG_SAVE_AS_TEMPLATE = 'space-flag-save-as-template',
  SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-flag-virtual-contributor-access',
  SPACE_FLAG_WHITEBOARD_MULTI_USER = 'space-flag-whiteboard-multi-user',
  SPACE_FLAG_MEMO_MULTI_USER = 'space-flag-memo-multi-user',
}

const licenseCredentialRules: CredentialRule[] = [
  {
    id: randomUUID(),
    credentialType:
      LicensingCredentialBasedCredentialType.SPACE_FEATURE_VIRTUAL_CONTRIBUTORS,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        limit: 1,
      },
    ],
    name: 'Space Virtual Contributors',
  },
  {
    id: randomUUID(),
    credentialType:
      LicensingCredentialBasedCredentialType.SPACE_FEATURE_WHITEBOARD_MULTI_USER,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
    ],
    name: 'Space Multi-user whiteboards',
  },
  {
    id: randomUUID(),
    credentialType:
      LicensingCredentialBasedCredentialType.SPACE_FEATURE_SAVE_AS_TEMPLATE,
    grantedEntitlements: [
      { type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE, limit: 1 },
    ],
    name: 'Space Save As Template',
  },
  {
    id: randomUUID(),
    credentialType:
      LicensingCredentialBasedCredentialType.SPACE_FEATURE_MEMO_MULTI_USER,
    grantedEntitlements: [
      { type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER, limit: 1 },
    ],
    name: 'Space Multi-User memo',
  },
  {
    id: randomUUID(),
    credentialType: LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
    grantedEntitlements: [
      { type: LicenseEntitlementType.SPACE_FREE, limit: 1 },
    ],
    name: 'Space License Free',
  },
  {
    id: randomUUID(),
    credentialType: LicensingCredentialBasedCredentialType.SPACE_LICENSE_PLUS,
    grantedEntitlements: [
      { type: LicenseEntitlementType.SPACE_PLUS, limit: 1 },
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
      { type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE, limit: 1 },
    ],
    name: 'Space License Plus',
  },
  {
    id: randomUUID(),
    credentialType:
      LicensingCredentialBasedCredentialType.SPACE_LICENSE_PREMIUM,
    grantedEntitlements: [
      { type: LicenseEntitlementType.SPACE_PREMIUM, limit: 1 },
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
      { type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE, limit: 1 },
    ],
    name: 'Space License Premium',
  },
  {
    id: randomUUID(),
    credentialType: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_FREE,
    grantedEntitlements: [
      { type: LicenseEntitlementType.ACCOUNT_SPACE_FREE, limit: 1 },
    ],
    name: 'Account License Free',
  },
  {
    id: randomUUID(),
    credentialType: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
    grantedEntitlements: [
      { type: LicenseEntitlementType.ACCOUNT_SPACE_FREE, limit: 3 },
      { type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR, limit: 3 },
      { type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB, limit: 1 },
      { type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK, limit: 3 },
    ],
    name: 'Account License Plus',
  },
];

enum TemplateDefaultType {
  PLATFORM_SPACE = 'platform-space',
  PLATFORM_SPACE_TUTORIALS = 'platform-space-tutorials',
  PLATFORM_SUBSPACE = 'platform-subspace',
  PLATFORM_SUBSPACE_KNOWLEDGE = 'platform-subspace-knowledge',
  SPACE_SUBSPACE = 'space-subspace',
}

enum TemplateType {
  CALLOUT = 'callout',
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  INNOVATION_FLOW = 'innovation-flow',
  COLLABORATION = 'collaboration',
}
