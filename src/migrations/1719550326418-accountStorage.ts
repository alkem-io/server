import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class accountStorage1719550326418 implements MigrationInterface {
  name = 'accountStorage1719550326418';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `account` ADD `storageAggregatorId` char(36) NULL'
    );

    const accounts: {
      id: string;
      spaceId: string;
    }[] = await queryRunner.query(`SELECT id, spaceId FROM \`account\``);
    for (const account of accounts) {
      const accountStorageAggregatorID =
        await this.createStorageAggregatorOnAccount(queryRunner, account.id);
      const [rootSpace]: {
        id: string;
        storageAggregatorId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageAggregatorId FROM space WHERE id = '${account.spaceId}'`
      );
      if (rootSpace) {
        await queryRunner.query(
          `UPDATE storage_aggregator SET parentStorageAggregatorId = '${accountStorageAggregatorID}' WHERE id = '${rootSpace.storageAggregatorId}'`
        );
      } else {
        console.log(`No root space found for account ${account.id}`);
      }
    }

    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_99998853c1ee793f61bda7eff79\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createStorageAggregatorOnAccount(
    queryRunner: QueryRunner,
    accountID: string
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();

    const directStorageId = await this.createStorageBucket(queryRunner);

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
          ('${storageAggregatorAuthID}',
          1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, version, authorizationId, directStorageId)
                VALUES ('${storageAggregatorID}',
                        '1',
                        '${storageAggregatorAuthID}',
                        '${directStorageId}')`
    );

    await queryRunner.query(
      `UPDATE \`account\` SET storageAggregatorId = '${storageAggregatorID}' WHERE (id = '${accountID}')`
    );

    return storageAggregatorID;
  }

  private async createStorageBucket(queryRunner: QueryRunner): Promise<string> {
    const storageBucketID = randomUUID();
    const storageBucketAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
          ('${storageBucketAuthID}',
          1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
              VALUES ('${storageBucketID}',
                      '1',
                      '${storageBucketAuthID}',
                      '${allowedTypes}',
                      ${maxAllowedFileSize},
                      null)`
    );

    return storageBucketID;
  }
}

export const allowedTypes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'image/bmp',
  'image/jpg',
  'image/jpeg',
  'image/x-png',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

export const maxAllowedFileSize = 15728640;
