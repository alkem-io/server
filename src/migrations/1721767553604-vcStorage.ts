import { MigrationInterface, QueryRunner } from 'typeorm';

export class VcStorage1721767553604 implements MigrationInterface {
  name = 'VcStorage1721767553604';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
          `SELECT id FROM \`storageBucket\` where storageAggregatorId = '${vc.storageAggregatorId}'`
        );
        for (const storageBucket of storageBuckets) {
          await queryRunner.query(
            `UPDATE storage_bucket SET storageAggregatorId = '${account.storageAggregatorId}' WHERE id = '${storageBucket.id}'`
          );
        }
      } else {
        console.log(`No account found for virtual contributor ${vc.id}`);
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
