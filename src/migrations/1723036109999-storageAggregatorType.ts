import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorageAggregatorType1723036109999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the storage aggregator table
    await queryRunner.query(
      'ALTER TABLE `storage_aggregator` ADD `type` varchar(36) NULL'
    );
    await this.updateStorageAggregatorTypeForEntity(
      queryRunner,
      'account',
      'account'
    );
    await this.updateStorageAggregatorTypeForEntity(
      queryRunner,
      'space',
      'space'
    );
    await this.updateStorageAggregatorTypeForEntity(
      queryRunner,
      'user',
      'user'
    );
    await this.updateStorageAggregatorTypeForEntity(
      queryRunner,
      'organization',
      'organization'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateStorageAggregatorTypeForEntity(
    queryRunner: QueryRunner,
    entityType: string,
    storageAggregatorType: string
  ) {
    const entities: {
      id: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM \`${entityType}\``
    );
    for (const entity of entities) {
      const [storageAggregator]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM storage_aggregator WHERE id = '${entity.storageAggregatorId}'`
      );
      if (storageAggregator) {
        await queryRunner.query(
          `UPDATE \`storage_aggregator\` SET type = '${storageAggregatorType}' WHERE id = '${storageAggregator.id}'`
        );
      } else {
        console.log(
          `No storage_aggregator found for ${entityType}: ${entity.id}`
        );
      }
    }
  }
}
