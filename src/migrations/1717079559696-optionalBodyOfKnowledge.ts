import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class optionalBodyOfKnowledge1717079559696
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_contributor');
    const bokColumn = table?.findColumnByName('bodyOfKnowledgeID');
    if (bokColumn && !bokColumn.isNullable) {
      await queryRunner.changeColumn(
        'virtual_contributor',
        'bodyOfKnowledgeID',
        new TableColumn({
          name: 'bodyOfKnowledgeID',
          type: bokColumn.type,
          isNullable: true,
        })
      );
    }
    const bokTypeColum = table?.findColumnByName('bodyOfKnowledgeType');
    if (bokTypeColum && !bokTypeColum.isNullable) {
      await queryRunner.changeColumn(
        'virtual_contributor',
        'bodyOfKnowledgeType',
        new TableColumn({
          name: 'bodyOfKnowledgeType',
          type: bokTypeColum.type,
          isNullable: true,
          length: '64',
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_contributor');
    const bokColumn = table?.findColumnByName('bodyOfKnowledgeID');
    if (bokColumn && bokColumn.isNullable) {
      await queryRunner.changeColumn(
        'virtual_contributor',
        'bodyOfKnowledgeID',
        new TableColumn({
          name: 'bodyOfKnowledgeID',
          type: bokColumn.type,
          isNullable: false,
        })
      );
    }
    const bokTypeColum = table?.findColumnByName('bodyOfKnowledgeType');
    if (bokTypeColum && bokTypeColum.isNullable) {
      await queryRunner.changeColumn(
        'virtual_contributor',
        'bodyOfKnowledgeType',
        new TableColumn({
          name: 'bodyOfKnowledgeType',
          type: bokTypeColum.type,
          isNullable: false,
          length: '255',
        })
      );
    }
  }
}
