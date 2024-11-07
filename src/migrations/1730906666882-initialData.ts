import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  allowedTypes,
  maxAllowedFileSize,
} from './utils/storage/storage-bucket-utils';

export class InitialData1730906666882 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const migrations = await queryRunner.query(
      'SELECT name FROM migrations_typeorm;'
    );

    if (migrations.length > 1) {
      return;
    }

    await this.initializePlatform(queryRunner);
    await this.initializePreferenceDefinitions(queryRunner);
    await this.initializeAiServer(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async initializePlatform(queryRunner: QueryRunner): Promise<void> {
    const libraryID = await this.initializeLibrary(queryRunner);
    const platformAuthID = randomUUID();
    const platformID = randomUUID();
    const platformStorageAggregatorID =
      await this.createStorageAggregator(queryRunner);

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${platformAuthID}', NOW(), NOW(), 1, '', '', '', 0, 'platform')`
    );
    await queryRunner.query(
      `INSERT INTO platform (id, createdDate, updatedDate, version, authorizationId, libraryId, storageAggregatorId) VALUES ('${platformID}', NOW(), NOW(), 1, '${platformAuthID}', '${libraryID}', '${platformStorageAggregatorID}')`
    );

    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_11d0ed50a26da5513f7e4347847\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      'ALTER TABLE `storage_aggregator` ADD CONSTRAINT `FK_0647707288c243e60091c8d8620` FOREIGN KEY (`directStorageId`) REFERENCES `storage_bucket`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await this.initializePlatformLicensing(queryRunner, platformID);
    await this.initializePlatformTemplatesManager(queryRunner);
  }

  private async initializeLibrary(queryRunner: QueryRunner): Promise<string> {
    const libraryAuthID = randomUUID();
    const libraryID = randomUUID();
    const libraryAuthPolicy = `[{"type":"global-admin","resourceID":"","grantedPrivileges":["create","read","update","delete"],"inheritable":true},{"type":"global-admin-hubs","resourceID":"","grantedPrivileges":["create","read","update","delete"],"inheritable":true}]`;

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${libraryAuthID}', NOW(), NOW(), 1, '${libraryAuthPolicy}', '', '', 0, 'library')`
    );
    await queryRunner.query(
      `INSERT INTO library (id, createdDate, updatedDate, version, authorizationId) VALUES ('${libraryID}', NOW(), NOW(), 1, '${libraryAuthID}')`
    );

    return libraryID;
  }

  private async initializePlatformLicensing(
    queryRunner: QueryRunner,
    platformID: string
  ): Promise<void> {
    const licensePolicyID = randomUUID();
    const licensePolicyAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                    ('${licensePolicyAuthID}',
                    1, '', '', 0, '', 'license-policy')`
    );
    await queryRunner.query(
      `INSERT INTO license_policy (id, version, authorizationId, credentialRulesStr) VALUES
                ('${licensePolicyID}',
                1,
                '${licensePolicyAuthID}',
                '${JSON.stringify(licenseCredentialRules)}'
                )`
    );

    const licensingID = randomUUID();
    const licensingAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                    ('${licensingAuthID}',
                    1, '', '', 0, '', 'licensing')`
    );
    await queryRunner.query(
      `INSERT INTO licensing (id, version, authorizationId, licensePolicyId) VALUES
                ('${licensingID}',
                1,
                '${licensingAuthID}',
                '${licensePolicyID}')`
    );
    await queryRunner.query(
      `UPDATE platform SET licensingId = '${licensingID}' WHERE id = '${platformID}'`
    );
  }

  private async initializePlatformTemplatesManager(
    queryRunner: QueryRunner
  ): Promise<void> {
    const platformTemplatesManagerID = await this.createTemplatesManager(
      queryRunner,
      undefined
    );
    await queryRunner.query(
      `UPDATE \`platform\` SET templatesManagerId = '${platformTemplatesManagerID}'`
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
      TemplateType.COLLABORATION
    );
  }

  private async initializePreferenceDefinitions(
    queryRunner: QueryRunner
  ): Promise<void> {
    const preferenceDefinitionIds = [...Array(29)].map(() => randomUUID());

    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, groupName, displayName, description, valueType, type, definitionSet)
       VALUES
         ('${preferenceDefinitionIds[0]}', 1, 'Notification', 'Community Application', 'Receive notification when I apply to join a community', 'boolean', 'NotificationApplicationSubmitted', 'user'),
         ('${preferenceDefinitionIds[1]}', 1, 'Notification', 'Community Updates', 'Receive notification when a new update is shared with a community I am a member of', 'boolean', 'NotificationCommunityUpdates', 'user'),
         ('${preferenceDefinitionIds[2]}', 1, 'Notification', 'Community Discussion created', 'Receive notification when a new discussion is created on a community I am a member of', 'boolean', 'NotificationCommunityDiscussionCreated', 'user'),
         ('${preferenceDefinitionIds[3]}', 1, 'NotificationForum', 'Receive a notification when a new comment is added to a Discussion I created in the Forum', 'Receive a notification when a new comment is added to a Discussion I created in the Forum', 'boolean', 'NotificationForumDiscussionComment', 'user'),
         ('${preferenceDefinitionIds[4]}', 1, 'NotificationCommunityAdmin', '[Admin] Community Applications', 'Receive notification when a new application is received for a community for which I am an administrator', 'boolean', 'NotificationApplicationReceived', 'user'),
         ('${preferenceDefinitionIds[5]}', 1, 'NotificationGlobalAdmin', '[Admin] New user sign up', 'Receive notification when a new user signs up', 'boolean', 'NotificationUserSignUp', 'user'),
         ('${preferenceDefinitionIds[6]}', 1, 'NotificationCommunication', 'Allow direct messages from other users', 'Receive a notification when a user wants to directly send you a message or shares with you', 'boolean', 'NotificationCommunicationMessage', 'user'),
         ('${preferenceDefinitionIds[7]}', 1, 'Notification', 'Community new member', 'Receive notification when I join a community', 'boolean', 'NotificationCommunityNewMember', 'user'),
         ('${preferenceDefinitionIds[8]}', 1, 'Notification', 'New Callout published', 'Receive a notification when a Callout is published in a community I am a member of', 'boolean', 'NotificationCalloutPublished', 'user'),
         ('${preferenceDefinitionIds[9]}', 1, 'NotificationCommunityAdmin', '[Admin] Community Discussion Created', 'Receive notification when a new discussion is created for a community for which I am an administrator', 'boolean', 'NotificationCommunityDiscussionCreatedAdmin', 'user'),
         ('${preferenceDefinitionIds[10]}', 1, 'NotificationCommunityAdmin', '[Admin] Community Updates', 'Receive notification when a new update is shared with a community for which I am an administrator', 'boolean', 'NotificationCommunityUpdateSentAdmin', 'user'),
         ('${preferenceDefinitionIds[11]}', 1, 'Notification', 'Comment replies', 'Receive a notification when someone replies to your comment', 'boolean', 'NotificationCommentReply', 'user'),
         ('${preferenceDefinitionIds[12]}', 1, 'NotificationCommunication', 'Mentions or tags of you in posts or comments', 'Receive a notification when a user tags you in a post or a comment', 'boolean', 'NotificationCommunicationMention', 'user'),
         ('${preferenceDefinitionIds[13]}', 1, 'Notification', 'New Post created', 'Receive notification when a Post is created in community I am a member of', 'boolean', 'NotificationPostCreated', 'user'),
         ('${preferenceDefinitionIds[14]}', 1, 'NotificationCommunityAdmin', '[Admin] New opportunity collaboration interest', 'Receive notification when a user submits collaboration interest for an opportunity community I am administrator of', 'boolean', 'NotificationCommunityCollaborationInterestAdmin', 'user'),
         ('${preferenceDefinitionIds[15]}', 1, 'NotificationOrganizationAdmin', 'Mentions or tags of an organization you manage', 'Receive a notification when the organization you are admin of is mentioned', 'boolean', 'NotificationOrganizationMention', 'user'),
         ('${preferenceDefinitionIds[16]}', 1, 'Notification', 'New comment on my Post', 'Receive notification when a comment is created on my Post', 'boolean', 'NotificationPostCommentCreated', 'user'),
         ('${preferenceDefinitionIds[17]}', 1, 'NotificationForum', 'Receive a notification when a new Discussion is created in the Forum', 'Receive a notification when a new Discussion is created in the Forum', 'boolean', 'NotificationForumDiscussionCreated', 'user'),
         ('${preferenceDefinitionIds[18]}', 1, 'Notification', 'Community review submitted', 'Receive notification when you submit a new community review', 'boolean', 'NotificationCommunityReviewSubmitted', 'user'),
         ('${preferenceDefinitionIds[19]}', 1, 'Notification', 'New Whiteboard created', 'Receive a notification when a Whiteboard is created in a community I am a member of', 'boolean', 'NotificationWhiteboardCreated', 'user'),
         ('${preferenceDefinitionIds[20]}', 1, 'NotificationCommunityAdmin', '[Admin] New Post created', 'Receive notification when a Post is created in a community I am administrator of', 'boolean', 'NotificationPostCreatedAdmin', 'user'),
         ('${preferenceDefinitionIds[21]}', 1, 'Notification', 'Invitations to a community', 'Receive a notification when someone invites you to join a community', 'boolean', 'NotificationCommunityInvitationUser', 'user'),
         ('${preferenceDefinitionIds[22]}', 1, 'Notification', 'Opportunity collaboration interest confirmation', 'User receives confirmation email when submits interest for collaboration on an opportunity.', 'boolean', 'NotificationCommunityCollaborationInterestUser', 'user'),
         ('${preferenceDefinitionIds[23]}', 1, 'NotificationGlobalAdmin', '[Admin] User profile deleted', 'Receive a notification when a user profile is removed', 'boolean', 'NotificationUserRemoved', 'user'),
         ('${preferenceDefinitionIds[24]}', 1, 'NotificationCommunityAdmin', '[Admin] Community new member', 'Receive notification when a new user joins a community for which I am an administrator', 'boolean', 'NotificationCommunityNewMemberAdmin', 'user'),
         ('${preferenceDefinitionIds[25]}', 1, 'Notification', 'New comment on Discussion', 'Receive a notification when a new comment is added to a Discussion in a community I am a member of', 'boolean', 'NotificationDiscussionCommentCreated', 'user'),
         ('${preferenceDefinitionIds[26]}', 1, 'AuthorizationOrganization', 'Domain based membership', 'Automatically add new users with emails matching the domain of the Organization', 'boolean', 'AuthorizationOrganizationMatchDomain', 'organization'),
         ('${preferenceDefinitionIds[27]}', 1, 'NotificationOrganizationAdmin', 'Allow direct messages to organizations you manage', 'Receive notification when the organization you are admin of is messaged', 'boolean', 'NotificationOrganizationMessage', 'user'),
         ('${preferenceDefinitionIds[28]}', 1, 'NotificationCommunityAdmin', '[Admin] Community review submitted', 'Receive notification when a new community review is submitted by a member', 'boolean', 'NotificationCommunityReviewSubmittedAdmin', 'user')`
    );
  }

  private async initializeAiServer(queryRunner: QueryRunner): Promise<void> {
    const aiServerID = randomUUID();
    const aiServerAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                      ('${aiServerAuthID}',
                      1, '', '', 0, '', 'ai-server')`
    );
    await queryRunner.query(
      `INSERT INTO ai_server (id, version, authorizationId) VALUES
                  ('${aiServerID}',
                  1,
                  '${aiServerAuthID}')`
    );
  }

  private async createStorageAggregator(
    queryRunner: QueryRunner
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();
    const directStorageID = randomUUID();
    const directStorageAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type)
        VALUES ('${storageAggregatorAuthID}', 1, '', '', 0, '', 'storage-aggregator')`
    );

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type)
        VALUES ('${directStorageAuthID}', 1, '', '', 0, '', 'storage-bucket')`
    );

    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, version, authorizationId, directStorageId)
        VALUES ('${storageAggregatorID}', 1, '${storageAggregatorAuthID}', '${directStorageID}')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
        VALUES ('${directStorageID}', '1', '${directStorageAuthID}', '${allowedTypes}', ${maxAllowedFileSize}, '${storageAggregatorID}')`
    );

    return storageAggregatorID;
  }

  private async createTemplatesManager(
    queryRunner: QueryRunner,
    templatesSetInputId: string | undefined
  ): Promise<string> {
    const templatesManagerID = randomUUID();
    const templatesManagerAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'templates_manager'
    );
    let templatesSetID = templatesSetInputId;
    if (!templatesSetID) {
      templatesSetID = await this.createTemplatesSet(queryRunner);
    }

    // create the new templates manager
    await queryRunner.query(
      `INSERT INTO templates_manager (id, version, authorizationId, templatesSetId) VALUES
              (
              '${templatesManagerID}',
              1,
              '${templatesManagerAuthID}',
              '${templatesSetID}')`
    );

    return templatesManagerID;
  }

  private async createTemplatesSet(queryRunner: QueryRunner): Promise<string> {
    const templatesSetID = randomUUID();
    const templatesSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'templates_set'
    );
    // create the new templates set
    await queryRunner.query(
      `INSERT INTO templates_set (id, version, authorizationId) VALUES
              (
              '${templatesSetID}',
              1,
              '${templatesSetAuthID}')`
    );
    return templatesSetID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
              ('${authID}',
              1, '', '', 0, '', '${policyType}')`
    );
    return authID;
  }

  private async createTemplateDefault(
    queryRunner: QueryRunner,
    templatesManagerID: string,
    templateDefaultType: TemplateDefaultType,
    allowedTemplateType: TemplateType
  ): Promise<string> {
    const templateDefaultID = randomUUID();
    const templateDefaultAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'template_default'
    );
    await queryRunner.query(
      `INSERT INTO template_default (id, version, type, allowedTemplateType, authorizationId, templatesManagerId) VALUES
              (
              '${templateDefaultID}',
              1,
              '${templateDefaultType}',
              '${allowedTemplateType}',
              '${templateDefaultAuthID}',
              '${templatesManagerID}')`
    );
    return templateDefaultID;
  }
}

type CredentialRule = {
  credentialType: LicenseCredential;
  grantedPrivileges: LicensePrivilege[];
  name: string;
};

enum LicenseCredential {
  FEATURE_VIRTUAL_CONTRIBUTORS = 'space-feature-virtual-contributors',
  FEATURE_WHITEBOARD_MULTI_USER = 'space-feature-whiteboard-multi-user',
  FEATURE_SAVE_AS_TEMPLATE = 'space-feature-save-as-template',
  LICENSE_PLUS = 'space-license-plus',
  LICENSE_PREMIUM = 'space-license-premium',
  ACCOUNT_LICENSE_PLUS = 'account-license-plus',
}

enum LicensePrivilege {
  VIRTUAL_CONTRIBUTOR_ACCESS = 'space-virtual-contributor-access',
  WHITEBOARD_MULTI_USER = 'space-whiteboard-multi-user',
  SAVE_AS_TEMPLATE = 'space-save-as-template',
  CREATE_SPACE = 'account-create-space',
  CREATE_VIRTUAL_CONTRIBUTOR = 'account-create-virtual-contributor',
  CREATE_INNOVATION_PACK = 'account-create-innovation-pack',
}

const licenseCredentialRules: CredentialRule[] = [
  {
    credentialType: LicenseCredential.FEATURE_VIRTUAL_CONTRIBUTORS,
    grantedPrivileges: [LicensePrivilege.VIRTUAL_CONTRIBUTOR_ACCESS],
    name: 'Space Virtual Contributors',
  },
  {
    credentialType: LicenseCredential.FEATURE_WHITEBOARD_MULTI_USER,
    grantedPrivileges: [LicensePrivilege.WHITEBOARD_MULTI_USER],
    name: 'Space Multi-user whiteboards',
  },
  {
    credentialType: LicenseCredential.FEATURE_SAVE_AS_TEMPLATE,
    grantedPrivileges: [LicensePrivilege.SAVE_AS_TEMPLATE],
    name: 'Space Save As Template',
  },
  {
    credentialType: LicenseCredential.LICENSE_PLUS,
    grantedPrivileges: [
      LicensePrivilege.WHITEBOARD_MULTI_USER,
      LicensePrivilege.SAVE_AS_TEMPLATE,
    ],
    name: 'Space License Plus',
  },
  {
    credentialType: LicenseCredential.LICENSE_PREMIUM,
    grantedPrivileges: [
      LicensePrivilege.WHITEBOARD_MULTI_USER,
      LicensePrivilege.SAVE_AS_TEMPLATE,
    ],
    name: 'Space License Premium',
  },
  {
    credentialType: LicenseCredential.ACCOUNT_LICENSE_PLUS,
    grantedPrivileges: [
      LicensePrivilege.CREATE_SPACE,
      LicensePrivilege.CREATE_VIRTUAL_CONTRIBUTOR,
      LicensePrivilege.CREATE_INNOVATION_PACK,
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
