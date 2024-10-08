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
      guidelinesId: string;
    }[] = await queryRunner.query(
      `SELECT id, type, guidelinesId FROM community`
    );
    for (const community of communities) {
      // Add to all communities that don't have guidelines
      if (community.guidelinesId === null) {
        let storageAggregatorID: string | undefined = undefined;
        if (community.type === 'space') {
          const [space]: {
            id: string;
            storageAggregatorId: string;
          }[] = await queryRunner.query(
            `SELECT id, storageAggregatorId FROM space WHERE communityId = '${community.id}'`
          );
          if (space === undefined) {
            console.log(
              `Community with id:  ${community.id} of type ${community.type}  does not have a parent ${community.type}`
            );
            continue;
          }
          storageAggregatorID = space.storageAggregatorId;
        } else if (community.type === 'challenge') {
          const [challenge]: {
            id: string;
            storageAggregatorId: string;
          }[] = await queryRunner.query(
            `SELECT id, storageAggregatorId FROM challenge WHERE communityId = '${community.id}'`
          );
          if (challenge === undefined) {
            console.log(
              `Community with id:  ${community.id} of type ${community.type}  does not have a parent ${community.type}`
            );
            continue;
          }
          storageAggregatorID = challenge.storageAggregatorId;
        } else if (community.type === 'opportunity') {
          const [opportunity]: {
            id: string;
            storageAggregatorId: string;
          }[] = await queryRunner.query(
            `SELECT id, storageAggregatorId FROM opportunity WHERE communityId = '${community.id}'`
          );
          if (opportunity === undefined) {
            console.log(
              `Community with id:  ${community.id} of type ${community.type}  does not have a parent ${community.type}`
            );
            continue;
          }
          storageAggregatorID = opportunity.storageAggregatorId;
        } else {
          console.log(`Unknown community type: ${community.type}`);
          break;
        }

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
