import { MigrationInterface, QueryRunner } from 'typeorm';

export class VcStorage1721767553604 implements MigrationInterface {
  name = 'VcStorage1721767553604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and drop FK constraints if they exist
    await queryRunner
      .query(
        `
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'virtual_contributor'
  AND CONSTRAINT_NAME = 'FK_29a529635a2b2db9f37ca6d3521'
`
      )
      .then(async result => {
        if (result.length > 0) {
          await queryRunner.query(
            `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_29a529635a2b2db9f37ca6d3521\``
          );
        }
      });

    await queryRunner
      .query(
        `
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'virtual_contributor'
  AND CONSTRAINT_NAME = 'FK_ce68cea88d194e0240b737c3f0c'
`
      )
      .then(async result => {
        if (result.length > 0) {
          await queryRunner.query(
            `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_ce68cea88d194e0240b737c3f0c\``
          );
        }
      });

    // Logic is a) iterate over all VCs b) find the account storage bucket for each c) find all storage buckets
    // using the storage aggregator of the VC and update them to use the storage aggregator of the account
    const vcs: {
      id: string;
      accountId: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, accountId, storageAggregatorId FROM \`virtual_contributor\``
    );
    for (const vc of vcs) {
      const [account]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM account WHERE id = '${vc.accountId}'`
      );
      if (account) {
        const storageBuckets: {
          id: string;
          accountId: string;
          storageAggregatorId: string;
        }[] = await queryRunner.query(
          `SELECT id FROM \`storage_bucket\` where storageAggregatorId = '${vc.storageAggregatorId}'`
        );
        for (const storageBucket of storageBuckets) {
          await queryRunner.query(
            `UPDATE storage_bucket SET storageAggregatorId = '${account.storageAggregatorId}' WHERE id = '${storageBucket.id}'`
          );
        }
      } else {
        throw new Error(`No account found for virtual contributor ${vc.id}`);
      }
      // Delete the referred to storage aggregator
      await queryRunner.query(
        `DELETE FROM storage_aggregator WHERE id = '${vc.storageAggregatorId}'`
      );
    }
    // drop storageBucketId on virtual_contributor
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`storageAggregatorId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
