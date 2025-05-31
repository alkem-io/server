import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';

export class SpaceTemplate1748628720999 implements MigrationInterface {
  name = 'SpaceTemplate1748628720999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_21fdaf6dc88bdd6e8839e29b0bd\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_21fdaf6dc88bdd6e8839e29b0b\` ON \`template\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD \`contentSpaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE TABLE \`template_content_space\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`rowId\` int NOT NULL AUTO_INCREMENT, \`settings\` json NOT NULL, \`level\` int NOT NULL, \`authorizationId\` char(36) NULL, \`collaborationId\` char(36) NULL, \`aboutId\` char(36) NULL, UNIQUE INDEX \`IDX_93791de89f18db45fe1e9bd5e5\` (\`rowId\`), UNIQUE INDEX \`REL_6c3991ba75f25e07d478a6296d\` (\`authorizationId\`), UNIQUE INDEX \`REL_1101883dd80b6c54f3171979b9\` (\`collaborationId\`), UNIQUE INDEX \`REL_9d01f912e7465553e45a551509\` (\`aboutId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    // --- Begin migration logic for existing templates ---
    const templates: {
      id: string;
      collaborationId: string;
      profileId: string | null;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, profileId, type FROM \`template\` WHERE type = 'collaboration'`
    );
    for (const template of templates) {
      // 1. Change type to 'space'
      await queryRunner.query(
        `UPDATE \`template\` SET type = 'space' WHERE id = ?`,
        [template.id]
      );

      // 2. Create new profile for the space_about using helper

      let profileDescription = '';
      let profileDisplayName = 'Subspace';
      if (!template.profileId) {
        console.error(`Unable to load profile on template ${template.id}`);
        throw new Error(`Unable to load profile on template ${template.id}`);
      }
      // Copy description and displayName from the old profile if available
      const [oldProfile] = await queryRunner.query(
        `SELECT description, displayName, storageBucketId FROM profile WHERE id = ?`,
        [template.profileId]
      );
      profileDescription = oldProfile?.description || '';
      profileDisplayName = oldProfile?.displayName || 'Subspace';
      // Use the helper to create a new profile (with new storage bucket and authorization)
      const profileId = await this.createProfile(
        queryRunner,
        profileDisplayName,
        oldProfile?.storageBucketId,
        'space',
        profileDescription
      );
      // 3. Create new authorization for the about
      const aboutUUID = randomUUID();
      const aboutAuthUUID = await this.createAuthorizationPolicy(
        queryRunner,
        'space-about'
      );
      // Create space_about using the new profile and new about authorization
      const aboutWhy = `Fill out the why here`;
      const aboutWho = `Fill out the who here`;
      const communityGuidelinesId = await this.createCommunityGuidelines(
        queryRunner,
        oldProfile?.storageBucketId
      );
      await queryRunner.query(
        `INSERT INTO space_about (id, version, why, who, authorizationId, profileId, guidelinesId) VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [
          aboutUUID,
          aboutWhy,
          aboutWho,
          aboutAuthUUID,
          profileId,
          communityGuidelinesId,
        ]
      );
      // 4. Create new template_content_space, with a new authorization policy and set level to 1
      const spaceContentId = randomUUID();
      const spaceContentAuthID = await this.createAuthorizationPolicy(
        queryRunner,
        'template-content-space'
      );
      const settings = JSON.stringify(spaceDefaultsSettingsL1); // Default settings, adjust as needed
      const level = 1;
      await queryRunner.query(
        `INSERT INTO template_content_space (id, version, settings, level, authorizationId, collaborationId, aboutId) VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [
          spaceContentId,
          settings,
          level,
          spaceContentAuthID,
          template.collaborationId,
          aboutUUID,
        ]
      );
      // 5. Update template to point to new space content
      await queryRunner.query(
        `UPDATE \`template\` SET contentSpaceId = ? WHERE id = ?`,
        [spaceContentId, template.id]
      );
    }
    // Update all template_default entries with type 'collaboration' to 'space'
    await queryRunner.query(
      `UPDATE template_default SET allowedTemplateType = 'space' WHERE allowedTemplateType = 'collaboration'`
    );
    // --- End migration logic ---

    await queryRunner.query(
      `ALTER TABLE \`template\` ADD UNIQUE INDEX \`IDX_cbe03a4e82a555fe315271ca9f\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cbe03a4e82a555fe315271ca9f\` ON \`template\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` ADD CONSTRAINT \`FK_6c3991ba75f25e07d478a6296dd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` ADD CONSTRAINT \`FK_1101883dd80b6c54f3171979b99\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` ADD CONSTRAINT \`FK_9d01f912e7465553e45a551509b\` FOREIGN KEY (\`aboutId\`) REFERENCES \`space_about\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_cbe03a4e82a555fe315271ca9f8\` FOREIGN KEY (\`contentSpaceId\`) REFERENCES \`template_content_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `template` DROP COLUMN `collaborationId`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_cbe03a4e82a555fe315271ca9f8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` DROP FOREIGN KEY \`FK_9d01f912e7465553e45a551509b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` DROP FOREIGN KEY \`FK_1101883dd80b6c54f3171979b99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_content_space\` DROP FOREIGN KEY \`FK_6c3991ba75f25e07d478a6296dd\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cbe03a4e82a555fe315271ca9f\` ON \`template\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP INDEX \`IDX_cbe03a4e82a555fe315271ca9f\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9d01f912e7465553e45a551509\` ON \`template_content_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1101883dd80b6c54f3171979b9\` ON \`template_content_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6c3991ba75f25e07d478a6296d\` ON \`template_content_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_93791de89f18db45fe1e9bd5e5\` ON \`template_content_space\``
    );
    await queryRunner.query(`DROP TABLE \`template_content_space\``);
    await queryRunner.query(
      `ALTER TABLE \`template\` CHANGE \`contentSpaceId\` \`collaborationId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_21fdaf6dc88bdd6e8839e29b0b\` ON \`template\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_21fdaf6dc88bdd6e8839e29b0bd\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                    ('${authID}',
                    1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }

  private async createProfile(
    queryRunner: QueryRunner,
    displayName: string,
    siblingStorageBucketID: string,
    profileType: string,
    description: string
  ): Promise<string> {
    const profileId = randomUUID();
    const authID = await this.createAuthorizationPolicy(queryRunner, 'profile');
    const profileStorageBucketId = await this.createStorageBucket(
      queryRunner,
      siblingStorageBucketID
    );
    // Create a location for the profile with canonical fields
    const locationId = randomUUID();
    await queryRunner.query(
      `INSERT INTO location (id, version, city, country, addressLine1, addressLine2, stateOrProvince, postalCode) VALUES (?, 1, '', '', '', '', '', '')`,
      [locationId]
    );
    await queryRunner.query(
      `INSERT INTO profile (id, version, authorizationId, locationId, displayName, tagline, description, storageBucketId, type) VALUES
      (?, 1, ?, ?, ?, '', ?, ?, ?)`,
      [
        profileId,
        authID,
        locationId,
        `${displayName} Template`,
        description,
        profileStorageBucketId,
        profileType,
      ]
    );
    // Add tagset for the profile with canonical fields
    const tagsetId = randomUUID();
    const tagsetAuthId = await this.createAuthorizationPolicy(
      queryRunner,
      'tagset'
    );
    await queryRunner.query(
      `INSERT INTO tagset (id, version, authorizationId, profileId, name, type, tags) VALUES (?, 1, ?, ?, 'default', 'freeform', '')`,
      [tagsetId, tagsetAuthId, profileId]
    );
    return profileId;
  }

  private async createCommunityGuidelines(
    queryRunner: QueryRunner,
    siblingStorageBucketID: string
  ): Promise<string> {
    const newGuidelinesId = randomUUID();
    const authID = await this.createAuthorizationPolicy(
      queryRunner,
      'community-guidelines'
    );
    const profileID = await this.createProfile(
      queryRunner,
      'Professional Networking Community Name',
      siblingStorageBucketID,
      'community-guidelines',
      'Please fill out the community guidelines here'
    );
    await queryRunner.query(
      `INSERT INTO community_guidelines (id, version, authorizationId, profileId) VALUES (?, 1, ?, ?)`,
      [newGuidelinesId, authID, profileID]
    );

    return newGuidelinesId;
  }

  private async createStorageBucket(
    queryRunner: QueryRunner,
    siblingStorageBucketID: string
  ): Promise<string> {
    const newStorageBucketId = randomUUID();
    const authID = await this.createAuthorizationPolicy(
      queryRunner,
      'storage-bucket'
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
        SELECT '${newStorageBucketId}' as id, 1 as version, '${authID}' as authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId
          FROM storage_bucket WHERE id = '${siblingStorageBucketID}'`
    );

    return newStorageBucketId;
  }
}

export const spaceDefaultsSettingsL1 = {
  privacy: {
    mode: 'public',
    allowPlatformSupportAsAdmin: false,
  },
  membership: {
    policy: 'open',
    trustedOrganizations: [],
    allowSubspaceAdminsToInviteMembers: false,
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
    allowEventsFromSubspaces: true,
  },
};
