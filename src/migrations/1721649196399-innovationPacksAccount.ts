import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationPacksAccount1721649196399 implements MigrationInterface {
  name = 'InnovationPacksAccount1721649196399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_77777450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_6664d59c0b805c9c1ecb0070e16\``
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP COLUMN \`libraryId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD \`listedInStore\` tinyint NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD \`accountId\` char(36) NULL`
    );

    let accountID = '';

    const libraryStorageAggregatorID =
      await this.getLibraryStorageAggregatorID(queryRunner);

    const innovationPacks: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`innovation_pack\``);
    for (const innovationPack of innovationPacks) {
      const [providerCredential]: {
        id: string;
        agentId: string;
      }[] = await queryRunner.query(
        `SELECT id, agentId FROM credential WHERE resourceID = '${innovationPack.id}' and type = 'innovation-pack-provider'`
      );
      if (providerCredential) {
        const [organization]: {
          id: string;
          agentId: string;
        }[] = await queryRunner.query(
          `SELECT id, agentId FROM organization WHERE agentId = '${providerCredential.agentId}'`
        );
        if (organization) {
          const accountHostCredentials: {
            id: string;
            agentId: string;
            resourceID: string;
          }[] = await queryRunner.query(
            `SELECT id, agentId, resourceID FROM credential WHERE agentId = '${organization.agentId}' and type = 'account-host'`
          );
          if (accountHostCredentials && accountHostCredentials.length > 0) {
            const accountHostCredential = accountHostCredentials[0];
            accountID = accountHostCredential.resourceID;
          }
        }
      }
      if (accountID == '') {
        throw new Error(
          `Account ID not found for innovation pack: ${innovationPack.id}`
        );
      }
      const [account]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM account WHERE id = '${accountID}'`
      );
      const listedInStore = true;
      const searchVisibility = 'public';
      await queryRunner.query(
        `UPDATE innovation_pack SET accountId = '${accountID}', listedInStore = ${listedInStore}, searchVisibility='${searchVisibility}' WHERE id = '${innovationPack.id}'`
      );

      // Update the storageAggregator on all storage buckets that used the old one
      const storageBuckets: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM \`storage_bucket\` where storageAggregatorId = '${libraryStorageAggregatorID}'`
      );
      for (const storageBucketLibrary of storageBuckets) {
        await queryRunner.query(
          `UPDATE storage_bucket SET storageAggregatorId = '${account.storageAggregatorId}' WHERE id = '${storageBucketLibrary.id}'`
        );
      }
    }

    // Drop the storage aggregator on library
    // TODO: No storage buckets, just authorization + profile: how to clean up?
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP COLUMN \`storageAggregatorId\``
    );

    // Remove all credentials of type 'innovation-pack-provider' that are not used
    await queryRunner.query(
      `DELETE FROM credential WHERE type = 'innovation-pack-provider'`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async getLibraryStorageAggregatorID(
    queryRunner: QueryRunner
  ): Promise<string> {
    const library: {
      id: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM library `
    );
    if (!library || !(library.length === 1)) {
      throw new Error(
        `Unable to retrieve storage aggregator on library ${library}`
      );
    }
    return library[0].storageAggregatorId;
  }
}
