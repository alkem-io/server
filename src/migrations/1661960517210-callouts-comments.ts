import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutsComments1661960517210 implements MigrationInterface {
  name = 'calloutsComments1661960517210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\``
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN discussionId TO commentsId;`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`comments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\``
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` RENAME COLUMN commentsId TO discussionId;`
    );

    await queryRunner.query(`UPDATE \`callout\` SET discussionId = NULL;`);

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`discussionId\`) REFERENCES \`discussion\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
