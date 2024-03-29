import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class communityGuideliness1711636518886 implements MigrationInterface {
  name = 'communityGuideliness1711636518886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const communities: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM community`);
    for (const community of communities) {
      // Process all non-space communities
      if (community.type !== 'space') {
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
