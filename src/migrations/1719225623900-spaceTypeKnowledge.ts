import { MigrationInterface, QueryRunner } from 'typeorm';

export class spaceTypeKnowledgeType1719225623900 implements MigrationInterface {
  name = 'spaceTypeKnowledgeType1719225623900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const spaces: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM space`);

    for (const space of spaces) {
      if (space.type === 'vc') {
        await queryRunner.query(
          `UPDATE space SET type = 'knowledge' WHERE id = '${space.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
