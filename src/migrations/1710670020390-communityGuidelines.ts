import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class communityGuidelines1710670020390 implements MigrationInterface {
  name = 'communityGuidelines1710670020390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`community_guidelines\` (\`id\` char(36) NOT NULL,
                                                                      \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                      \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                       \`version\` int NOT NULL,
                                                                       \`authorizationId\` char(36) NULL,
                                                                       \`profileId\` char(36) NULL,
                                                                       UNIQUE INDEX \`REL_684b272e6f7459439d41d2879e\` (\`authorizationId\`),
                                                                       UNIQUE INDEX \`REL_3d60fe4fa40d54bad7d51bb4bd\` (\`profileId\`),
                                                                       PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`guidelinesId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_2e7dd2fa8c829352cfbecb2cc9\` (\`guidelinesId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2e7dd2fa8c829352cfbecb2cc9\` ON \`community\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_684b272e6f7459439d41d2879ee\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_2e7dd2fa8c829352cfbecb2cc93\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const communities: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM community`);
    for (const community of communities) {
      // Only process spaces
      if (community.type === 'space') {
        const [space]: {
          id: string;
          storageAggregatorId: string;
        }[] = await queryRunner.query(
          `SELECT id, storageAggregatorId FROM space WHERE communityId = '${community.id}'`
        );
        const storageAggregatorID = space.storageAggregatorId;

        // Create and link the Profile
        const guidelinesID = randomUUID();
        const guidelinesAuthID = randomUUID();

        const profileID = randomUUID();
        const profileAuthID = randomUUID();

        const locationID = randomUUID();

        const storageBucketID = randomUUID();
        const storageBucketAuthID = randomUUID();

        const defaultTagsetID = randomUUID();
        const defaultTagsetAuthID = randomUUID();

        await queryRunner.query(
          `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${guidelinesAuthID}',
                    1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${profileAuthID}',
                    1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${storageBucketAuthID}',
                    1, '', '', 0, '')`
        );

        await queryRunner.query(
          `INSERT INTO location VALUES
            ('${locationID}', DEFAULT, DEFAULT, 1, '', '', '' ,'', '', '')`
        );

        await queryRunner.query(
          `INSERT INTO storage_bucket (id, version, storageAggregatorId, authorizationId) VALUES
                    ('${storageBucketID}',
                    1,
                    '${storageAggregatorID}',
                    '${storageBucketAuthID}')`
        );

        await queryRunner.query(
          `INSERT INTO profile (id, version, displayName, description, storageBucketId, type, authorizationId) VALUES
                    ('${profileID}',
                    1,
                    'Default Community Guidelines',
                    '',
                    '${storageBucketID}',
                    'community-guidelines',
                    '${profileAuthID}')`
        );

        await queryRunner.query(
          `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${defaultTagsetAuthID}',
                    1, '', '', 0, '')`
        );

        await queryRunner.query(
          `INSERT INTO tagset (id, version, name, tags, authorizationId, profileId, type) VALUES
                    ('${defaultTagsetID}', 1, 'default', '', '${defaultTagsetAuthID}', '${profileID}', 'freeform')`
        );

        await queryRunner.query(
          `INSERT INTO community_guidelines (id, version, authorizationId, profileId) VALUES
                    ('${guidelinesID}',
                    1,
                    '${guidelinesAuthID}',
                    '${profileID}')`
        );

        await queryRunner.query(
          `UPDATE community SET guidelinesId = '${guidelinesID}' WHERE id = '${community.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
