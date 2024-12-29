import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutsSet1735321009455 implements MigrationInterface {
  name = 'CalloutsSet1735321009455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
    );

    await queryRunner.query(`CREATE TABLE \`callouts_set\` (\`id\` char(36) NOT NULL,
                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                \`version\` int NOT NULL,
                                                \`groups\` json NOT NULL,
                                                \`type\` varchar(128) NOT NULL,
                                                \`authorizationId\` char(36) NULL,
                                                \`tagsetTemplateSetId\` char(36) NULL,
                                                UNIQUE INDEX \`REL_8f3fd7a83451183166aac4ad02\` (\`authorizationId\`),
                                                UNIQUE INDEX \`REL_211515f7e21e93136a6b905e84\` (\`tagsetTemplateSetId\`),
                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`knowledge_base\` (\`id\` char(36) NOT NULL,
                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                \`version\` int NOT NULL, \`authorizationId\` char(36) NULL,
                                                \`profileId\` char(36) NULL,
                                                \`calloutsSetId\` char(36) NULL,
                                                UNIQUE INDEX \`REL_610fe23f4b0c4d8e38f0d0fbf3\` (\`authorizationId\`),
                                                UNIQUE INDEX \`REL_0e8a8e02916c701eeed6bf866a\` (\`profileId\`),
                                                UNIQUE INDEX \`REL_970b16bb8c1f8daee6135b00c8\` (\`calloutsSetId\`),
                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`knowledgeBaseId\` char(36) NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`calloutsSetId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`calloutsSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` CHANGE \`settings\` \`settings\` json NOT NULL`
    );

    // Create calloutsSet for each collaboration
    const collaborations: {
      id: string;
      groupsStr: string;
      tagsetTemplateSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, groupsStr, tagsetTemplateSetId FROM \`collaboration\``
    );
    for (const collaboration of collaborations) {
      const calloutsSetID = await this.createCalloutsSet(
        queryRunner,
        collaboration.groupsStr,
        collaboration.tagsetTemplateSetId
      );
      await queryRunner.query(
        `UPDATE \`collaboration\` SET calloutsSetId = '${calloutsSetID}' WHERE id = '${collaboration.id}'`
      );
      // update all the callouts to point to the new calloutsSet
      await queryRunner.query(
        `UPDATE \`callout\` SET calloutsSetId = '${calloutsSetID}' WHERE collaborationId = '${collaboration.id}'`
      );
    }

    // TODO: create definitions for KnowledgeBase, and add column for it to VC. Then iterate over all VCs and create empty KBs etc.
    const virtualContributors: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM \`virtual_contributor\``
    );
    for (const virtualContributor of virtualContributors) {
      const [vcProfile]: {
        id: string;
        storageBucketId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageBucketId FROM profile WHERE id = ?`,
        [virtualContributor.profileId]
      );
      const knowledgeBaseID = randomUUID();
      const knowledgeBaseAuthID = await this.createAuthorizationPolicy(
        queryRunner,
        'knowledge-base'
      );
      const vcStorageBucketID = vcProfile.storageBucketId;

      const profileID = await this.createProfile(
        queryRunner,
        'Knowledge Base',
        vcStorageBucketID,
        'kowledge-base'
      );
      // Create an empty tagsetTemplateSet
      const tagsetTemplateSetID = randomUUID();
      await queryRunner.query(
        `INSERT INTO tagset_template_set (id, version) VALUES ('${tagsetTemplateSetID}', 1)`
      );
      const calloutsSetID = await this.createCalloutsSet(
        queryRunner,
        '[]',
        tagsetTemplateSetID
      );

      // Create the knowledge base entity
      await queryRunner.query(
        `INSERT INTO knowledge_base (id, version, authorizationId, profileId, calloutsSetId) VALUES
                    ('${knowledgeBaseID}',
                    1,
                    '${knowledgeBaseAuthID}',
                    '${profileID}',
                    '${calloutsSetID}')`
      );
      // and update the VC to point to the new KB
      await queryRunner.query(
        `UPDATE \`virtual_contributor\` SET knowledgeBaseId = '${knowledgeBaseID}' WHERE id = '${virtualContributor.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_409cc6ee5429588f868cd59a1d\` (\`knowledgeBaseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_409cc6ee5429588f868cd59a1d\` ON \`virtual_contributor\` (\`knowledgeBaseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_9e1ebbc0972fa354d33b67a1a0\` (\`calloutsSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9e1ebbc0972fa354d33b67a1a0\` ON \`collaboration\` (\`calloutsSetId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_409cc6ee5429588f868cd59a1de\` FOREIGN KEY (\`knowledgeBaseId\`) REFERENCES \`knowledge_base\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`knowledge_base\` ADD CONSTRAINT \`FK_610fe23f4b0c4d8e38f0d0fbf34\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`knowledge_base\` ADD CONSTRAINT \`FK_0e8a8e02916c701eeed6bf866ad\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`knowledge_base\` ADD CONSTRAINT \`FK_970b16bb8c1f8daee6135b00c82\` FOREIGN KEY (\`calloutsSetId\`) REFERENCES \`callouts_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_08d3fa19eb35058446dafa99192\` FOREIGN KEY (\`calloutsSetId\`) REFERENCES \`callouts_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` ADD CONSTRAINT \`FK_8f3fd7a83451183166aac4ad02f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` ADD CONSTRAINT \`FK_211515f7e21e93136a6b905e84a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_9e1ebbc0972fa354d33b67a1a02\` FOREIGN KEY (\`calloutsSetId\`) REFERENCES \`callouts_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`groupsStr\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`tagsetTemplateSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`collaborationId\``
    );
  }

  private async createCalloutsSet(
    queryRunner: QueryRunner,
    groupsStr: string,
    tagsetTemplateSetId: string
  ): Promise<string> {
    const calloutsSetID = randomUUID();
    const calloutsSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'callouts-set'
    );
    await queryRunner.query(
      `INSERT INTO callouts_set (id, version, authorizationId, tagsetTemplateSetId, callouts_set.groups, type) VALUES
                    (
                    '${calloutsSetID}',
                    1,
                    '${calloutsSetAuthID}',
                    '${tagsetTemplateSetId}',
                    '${groupsStr}',
                    'collaboration')`
    );
    return calloutsSetID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                    ('${authID}',
                    1, '[]', '[]', 0, '[]', '${policyType}')`
    );
    return authID;
  }

  private async createProfile(
    queryRunner: QueryRunner,
    entityName: string,
    siblingStorageBucketID: string,
    profileType: string
  ): Promise<string> {
    const profileId = randomUUID();
    const authID = await this.createAuthorizationPolicy(queryRunner, 'profile');
    const profileStorageBucketId = await this.createStorageBucket(
      queryRunner,
      siblingStorageBucketID
    );
    await queryRunner.query(
      `INSERT INTO profile (id, version, authorizationId, locationId, displayName, tagline, storageBucketId, type) VALUES
      ('${profileId}', 1, '${authID}', null, '${entityName} Template', '', '${profileStorageBucketId}', '${profileType}')`
    );

    return profileId;
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

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
