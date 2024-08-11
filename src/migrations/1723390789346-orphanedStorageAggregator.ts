import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrphanedStorageAggregator1723390789346
  implements MigrationInterface
{
  name = 'OrphanedStorageAggregator1723390789346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const aggregators: {
      id: string;
      storageBucketId: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, directStorageId, authorizationId FROM \`storage_aggregator\` where type is null`
    );
    for (const aggregator of aggregators) {
      const [storageBucket]: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId FROM storage_bucket WHERE id = '${aggregator.storageBucketId}'`
      );
      if (storageBucket) {
        // Delete the orphaned direct storage bucket authorization
        await queryRunner.query(
          `DELETE FROM \`authorization_policy\` WHERE id = '${storageBucket.authorizationId}'`
        );
        await queryRunner.query(
          `DELETE FROM \`storage_bucket\` WHERE id = '${storageBucket.id}'`
        );
      } else {
        console.log(
          `No storage_aggregator found for null storage aggregator: ${aggregator.id}`
        );
      }

      await queryRunner.query(
        `DELETE FROM \`authorization_policy\` WHERE id = '${aggregator.authorizationId}'`
      );
      await queryRunner.query(
        `DELETE FROM \`storage_aggregator\` WHERE id = '${aggregator.id}'`
      );
    }
  }
  public async down(queryRunner: QueryRunner): Promise<void> {}
}
