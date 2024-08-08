import { MigrationInterface, QueryRunner } from 'typeorm';
import { safelyDropFK } from './utils/safely-drop-foreignKey';

export class InnovationPacksAccount1721649196399 implements MigrationInterface {
  name = 'InnovationPacksAccount1721649196399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await safelyDropFK(
      queryRunner,
      'innovation_pack',
      'FK_77777450cf75dc486700ca034c6'
    );
    await safelyDropFK(
      queryRunner,
      'library',
      'FK_6664d59c0b805c9c1ecb0070e16'
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

    const innovationPacks = await queryRunner.query(
      `SELECT id FROM \`innovation_pack\``
    );
    if (innovationPacks.length > 0) {
      const defaultHostAccount = await this.getDefaultHostAccount(queryRunner);
      console.log(`Default host account: ${defaultHostAccount}`);

      const libraryStorageAggregatorID =
        await this.getLibraryStorageAggregatorID(queryRunner);

      for (const innovationPack of innovationPacks) {
        let accountID = defaultHostAccount;

        const providerCredential = await this.getProviderCredential(
          queryRunner,
          innovationPack.id
        );
        if (providerCredential) {
          const organization = await this.getOrganization(
            queryRunner,
            providerCredential.agentId
          );
          if (organization) {
            const accountHostCredential = await this.getAccountHostCredential(
              queryRunner,
              organization.agentId
            );
            if (accountHostCredential) {
              accountID = accountHostCredential.resourceID;
            }
          }
        }

        if (!accountID) {
          throw new Error(
            `Account ID not found for innovation pack: ${innovationPack.id}`
          );
        }

        const account = await this.getAccount(queryRunner, accountID);
        if (!account) {
          console.log(
            `Account ${accountID} does not have a storage aggregator`
          );
          continue;
        }
        const listedInStore = true;
        const searchVisibility = 'public';
        await queryRunner.query(
          `UPDATE innovation_pack SET accountId = '${accountID}', listedInStore = ${listedInStore}, searchVisibility='${searchVisibility}' WHERE id = '${innovationPack.id}'`
        );

        await this.updateStorageBuckets(
          queryRunner,
          libraryStorageAggregatorID,
          account.storageAggregatorId
        );
      }
    }

    await queryRunner.query(
      `ALTER TABLE \`library\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `DELETE FROM credential WHERE type = 'innovation-pack-provider'`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async getDefaultHostAccount(
    queryRunner: QueryRunner
  ): Promise<string> {
    const orgNamePattern = '%Alkemio%';
    let result = await queryRunner.query(
      `SELECT account.id as id FROM credential
        JOIN account ON credential.resourceID = account.id
        JOIN organization ON credential.agentId = organization.agentId
        JOIN profile ON organization.profileId = profile.id
      WHERE credential.type = 'account-host' AND profile.displayName LIKE ?`,
      [orgNamePattern]
    );

    if (!result || result.length === 0) {
      result = await queryRunner.query(
        `SELECT account.id as id FROM credential
          JOIN account ON credential.resourceID = account.id
          JOIN organization ON credential.agentId = organization.agentId
        WHERE credential.type = 'account-host' LIMIT 1`
      );

      if (!result || result.length === 0) {
        throw new Error(`No account-host credentials found.`);
      }
    }

    return result[0].id;
  }

  private async getLibraryStorageAggregatorID(
    queryRunner: QueryRunner
  ): Promise<string> {
    const library = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM library`
    );
    if (!library || library.length !== 1) {
      throw new Error(`Unable to retrieve storage aggregator on library`);
    }
    return library[0].storageAggregatorId;
  }

  private async getProviderCredential(
    queryRunner: QueryRunner,
    resourceId: string
  ): Promise<any> {
    const result = await queryRunner.query(
      `SELECT id, agentId FROM credential WHERE resourceID = ? and type = 'innovation-pack-provider'`,
      [resourceId]
    );
    return result[0];
  }

  private async getOrganization(
    queryRunner: QueryRunner,
    agentId: string
  ): Promise<any> {
    const result = await queryRunner.query(
      `SELECT id, agentId FROM organization WHERE agentId = ?`,
      [agentId]
    );
    return result[0];
  }

  private async getAccountHostCredential(
    queryRunner: QueryRunner,
    agentId: string
  ): Promise<any> {
    const result = await queryRunner.query(
      `SELECT id, agentId, resourceID FROM credential WHERE agentId = ? and type = 'account-host'`,
      [agentId]
    );
    return result[0];
  }

  private async getAccount(
    queryRunner: QueryRunner,
    accountId: string
  ): Promise<any> {
    const result = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM account WHERE id = ?`,
      [accountId]
    );
    return result[0];
  }

  private async updateStorageBuckets(
    queryRunner: QueryRunner,
    oldStorageAggregatorId: string,
    newStorageAggregatorId: string
  ): Promise<void> {
    const storageBuckets = await queryRunner.query(
      `SELECT id FROM \`storage_bucket\` WHERE storageAggregatorId = ?`,
      [oldStorageAggregatorId]
    );

    for (const storageBucket of storageBuckets) {
      await queryRunner.query(
        `UPDATE storage_bucket SET storageAggregatorId = ? WHERE id = ?`,
        [newStorageAggregatorId, storageBucket.id]
      );
    }
  }
}
