import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthAnonymousReadAccess1735321009666
  implements MigrationInterface
{
  name = 'AuthAnonymousReadAccess1735321009666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`anonymousReadAccess\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD COLUMN \`anonymousReadAccess\` BOOLEAN NOT NULL DEFAULT FALSE`
    );
  }
}
