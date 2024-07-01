import { MigrationInterface, QueryRunner } from 'typeorm';

export class discussionPrivacy1718174556250 implements MigrationInterface {
  name = 'discussionPrivacy1718174556250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`privacy\` varchar(255) NOT NULL DEFAULT 'authenticated'`
    );

    const discussions: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM discussion`);
    for (const discussion of discussions) {
      await queryRunner.query(
        `UPDATE discussion SET privacy = 'authenticated' WHERE id = '${discussion.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`privacy\``
    );
  }
}
