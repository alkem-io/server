import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationHubsStorageAggregators1722591262858
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const innovationHubs: {
      innovationHubId: string;
      storageBucketId: string;
      currentStorageAggregatorId: string;
      accountStorageAggregator: string;
    }[] = await queryRunner.query(
      `SELECT
        innovation_hub.id AS innovationHubId,
        profile.storageBucketId AS storageBucketId,
        storage_bucket.storageAggregatorId AS currentStorageAggregatorId,
        account.storageAggregatorId AS accountStorageAggregator
      FROM innovation_hub
        JOIN profile ON innovation_hub.profileId = profile.Id
        JOIN storage_bucket ON profile.storageBucketId = storage_bucket.id
        JOIN account ON innovation_hub.accountId = account.id;`
    );
    if (innovationHubs.length > 0) {
      for (const innovationHub of innovationHubs) {
        if (
          innovationHub.currentStorageAggregatorId !==
          innovationHub.accountStorageAggregator
        ) {
          await queryRunner.query(
            `UPDATE storage_bucket SET storageAggregatorId = ? WHERE id = ?`,
            [
              innovationHub.accountStorageAggregator,
              innovationHub.storageBucketId,
            ]
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
