import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthenticationIDToUser1764590889000
  implements MigrationInterface
{
  name = 'AddAuthenticationIDToUser1764590889000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "authenticationID" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_authenticationID" ON "user" ("authenticationID")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_authenticationID"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "authenticationID"`
    );
  }
}
