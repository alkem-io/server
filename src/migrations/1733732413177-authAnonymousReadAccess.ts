import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthAnonymousReadAccess1733732413177
  implements MigrationInterface
{
  name = 'AuthAnonymousReadAccess1733732413177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`anonymousReadAccess\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
