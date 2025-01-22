import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthAnonymousReadAccess1736446208855
  implements MigrationInterface
{
  name = 'AuthAnonymousReadAccess1736446208855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(
      `SHOW COLUMNS FROM \`authorization_policy\` LIKE 'anonymousReadAccess'`
    );

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE \`authorization_policy\` DROP COLUMN \`anonymousReadAccess\``
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(
      `SHOW COLUMNS FROM \`authorization_policy\` LIKE 'anonymousReadAccess'`
    );

    if (columnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`authorization_policy\` ADD COLUMN \`anonymousReadAccess\` BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }
  }
}
