import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  allowedTypes,
  maxAllowedFileSize,
} from './utils/storage/storage-bucket-utils';

export class storageOpportunity1697609633621 implements MigrationInterface {
  name = 'storageOpportunity1697609633621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` ADD \`storageAggregatorId\` char(36) NULL`
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_89894d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    // );

    // Loop over all opportunities
    const opportunities: {
      id: string;
      profileId: string;
      challengeId: string;
      collaborationId: string;
      communityId: string;
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, challengeId, collaborationId, communityId, innovationFlowId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      const [challenge]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM challenge WHERE (id = '${opportunity.challengeId}')`
      );
      const challengeStorageAggregatorID = challenge.storageAggregatorId;

      const opportunityStorageAggregatorId = await this.createStorageAggregator(
        queryRunner,
        opportunity.id,
        challengeStorageAggregatorID
      );

      await this.updateStorageAggregatorParentInOpportunity(
        queryRunner,
        opportunityStorageAggregatorId,
        opportunity.collaborationId,
        opportunity.communityId,
        opportunity.innovationFlowId,
        opportunity.profileId
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
      innovationFlowId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, challengeId, storageAggregatorId, collaborationId, communityId, innovationFlowId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      const [challenge]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM challenge WHERE (id = '${opportunity.challengeId}')`
      );
      const challengeStorageAggregatorID = challenge.storageAggregatorId;

      await this.updateStorageAggregatorParentInOpportunity(
        queryRunner,
        challengeStorageAggregatorID,
        opportunity.collaborationId,
        opportunity.communityId,
        opportunity.innovationFlowId,
        opportunity.profileId
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
    communityID: string,
    innovationFlowID: string,
    profileID: string
  ) {
    // Update all the pointers
    await this.updateProfileStorageAggregator(
      queryRunner,
      profileID,
      storageAggregatorID
    );

    await this.updateEntityProfileStorageAggregator(
      queryRunner,
      'innovation_flow',
      innovationFlowID,
      storageAggregatorID
    );

    const callouts: {
      id: string;
      collaborationId: string;
      framingId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, framingId FROM callout WHERE (collaborationId = '${collaborationID}')`
    );
    for (const callout of callouts) {
      await this.updateEntityProfileStorageAggregator(
        queryRunner,
        'callout_framing',
        callout.framingId,
        storageAggregatorID
      );
      const contributions: {
        id: string;
        postId: string;
        whiteboardId: string;
      }[] = await queryRunner.query(
        `SELECT id, postId, whiteboardId FROM callout_contribution WHERE (calloutId = '${callout.id}')`
      );
      for (const contribution of contributions) {
        if (contribution.postId) {
          await this.updateEntityProfileStorageAggregator(
            queryRunner,
            'post',
            contribution.postId,
            storageAggregatorID
          );
        }
        if (contribution.whiteboardId) {
          await this.updateEntityProfileStorageAggregator(
            queryRunner,
            'whiteboard',
            contribution.postId,
            storageAggregatorID
          );
        }
      }
    }
  }

  private async updateEntityProfileStorageAggregator(
    queryRunner: QueryRunner,
    entityName: string,
    entityID: string,
    storageAggregatorID: string
  ) {
    const [entity]: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM ${entityName} WHERE (id = '${entityID}')`
    );
    await this.updateProfileStorageAggregator(
      queryRunner,
      entity.profileId,
      storageAggregatorID
    );
  }

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
