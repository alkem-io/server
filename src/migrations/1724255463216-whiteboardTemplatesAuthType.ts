import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhiteboardTemplatesAuthType1724255463216
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`type\` = 'template' WHERE \`type\` = 'whiteboard-template'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
