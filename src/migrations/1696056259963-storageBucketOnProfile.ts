import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addStorageBucketRelation,
  allowedTypes,
  createStorageBucketAndLink,
  maxAllowedFileSize,
  removeStorageBucketAuths,
  removeStorageBucketRelation,
} from './utils/storage/storage-bucket-utils';

export class storageBucketOnProfile1696056259963 implements MigrationInterface {
  name = 'storageBucketOnProfile1696056259963';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`storageBucketId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_4a1c74fd2a61b32d9d9500e0650\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Add a storage bucket to users
    await addStorageBucketRelation(
      queryRunner,
      'FK_12341450cf75dc486700ca034c6',
      'user'
    );

    const users: { id: string }[] = await queryRunner.query(
      `SELECT id FROM user`
    );
    for (const user of users) {
      await createStorageBucketAndLink(
        queryRunner,
        'user',
        user.id,
        allowedTypes,
        maxAllowedFileSize,
        ''
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_4a1c74fd2a61b32d9d9500e0650\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`storageBucketId\``
    );

    //
    await removeStorageBucketAuths(queryRunner, ['user']);
    await removeStorageBucketRelation(
      queryRunner,
      'FK_12341450cf75dc486700ca034c6',
      'user'
    );
  }
}
