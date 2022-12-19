import { MigrationInterface, QueryRunner } from 'typeorm';

export class publish1671479990726 implements MigrationInterface {
  name = 'publish1671479990726';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`publishedBy\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`publishedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
    );

    const callouts: { id: string; createdDate: number }[] =
      await queryRunner.query(`SELECT id, createdDate FROM callout`);
    for (const callout of callouts) {
      // const date  = new Date(callout.createdDate);
      // await queryRunner.query(
      //     `UPDATE callout SET publishedDate = '${callout.createdDate}' WHERE id = '${callout.id}'`
      //   );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`publishedBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`publishedDate\``
    );
  }
}
