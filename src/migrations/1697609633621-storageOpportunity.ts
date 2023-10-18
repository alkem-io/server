import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  allowedTypes,
  maxAllowedFileSize,
} from './utils/storage/storage-bucket-utils';

export class storageOpportunity1697609633621 implements MigrationInterface {
  name = 'storageOpportunity1697609633621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`storageAggregatorId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_89894d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Loop over all opportunities
    const opportunities: {
      id: string;
      profileId: string;
      challengeId: string;
      collaborationId: string;
      communityId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, challengeId, collaborationId, communityId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      const [challenge]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM challenge WHERE (id = '${opportunity.id}')`
      );
      const challengeStorageAggregatorID = challenge.storageAggregatorId;

      const opportunityStorageAggregatorId = await this.createStorageAggregator(
        queryRunner,
        opportunity.id,
        challengeStorageAggregatorID
      );

      // Update all the pointers
      await this.updateProfileStorageAggregator(
        queryRunner,
        opportunity.profileId,
        opportunityStorageAggregatorId
      );

      await this.updateStorageAggregatorParentInOpportunity(
        queryRunner,
        opportunityStorageAggregatorId,
        opportunity.collaborationId,
        opportunity.communityId
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Opportunity ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_89894d59c0b805c9c1ecb0070e16\``
    );

    const opportunities: {
      id: string;
      profileId: string;
      challengeId: string;
      storageAggregatorId: string;
      collaborationId: string;
      communityId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, challengeId, storageAggregatorId, collaborationId, communityId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      const [challenge]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM challenge WHERE (id = '${opportunity.id}')`
      );
      const challengeStorageAggregatorID = challenge.storageAggregatorId;

      // Update all the pointers
      await this.updateProfileStorageAggregator(
        queryRunner,
        opportunity.profileId,
        challengeStorageAggregatorID
      );

      await this.updateStorageAggregatorParentInOpportunity(
        queryRunner,
        challengeStorageAggregatorID,
        opportunity.collaborationId,
        opportunity.communityId
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`storageAggregatorId\``
    );
  }

  private async updateStorageAggregatorParentInOpportunity(
    queryRunner: QueryRunner,
    storageAggregatorID: string,
    collaborationID: string,
    communityID: string
  ) {}

  private async updateProfileStorageAggregator(
    queryRunner: QueryRunner,
    profileID: string,
    storageAggregatorID: string
  ) {
    const [profile]: {
      id: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId FROM profile WHERE (id = '${profileID}')`
    );
    await queryRunner.query(
      `UPDATE \`storage_bucket\` SET storageAggregatorId = '${storageAggregatorID}' WHERE (id = '${profile.storageBucketId}')`
    );
  }

  private async createStorageAggregator(
    queryRunner: QueryRunner,
    opportunityID: string,
    challengeStorageAggregatorID: string
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();
    const directStorageID = randomUUID();
    const directStorageAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${storageAggregatorAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${directStorageAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
            VALUES ('${directStorageID}',
                    '1',
                    '${directStorageAuthID}',
                    '${allowedTypes}',
                    ${maxAllowedFileSize},
                    '${storageAggregatorID}')`
    );

    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, version, authorizationId, parentStorageAggregatorId, directStorageId)
              VALUES ('${storageAggregatorID}',
                      '1',
                      '${storageAggregatorAuthID}',
                      '${challengeStorageAggregatorID}',
                      '${directStorageID}')`
    );

    await queryRunner.query(
      `UPDATE \`opportunity\` SET storageAggregatorId = '${storageAggregatorID}' WHERE (id = '${opportunityID}')`
    );

    return storageAggregatorID;
  }
}
