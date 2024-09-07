import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorageBucket1725690587268 implements MigrationInterface {
  name = 'StorageBucket1725690587268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate index to authorization on storage bucket
    await queryRunner.query(
      `DROP INDEX \`REL_77994efc5eb5936ed70f2c55903\` ON \`storage_bucket\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
