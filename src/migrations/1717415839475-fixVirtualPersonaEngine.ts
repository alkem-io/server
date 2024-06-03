import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class fixVirtualPersonaEngine1717415839475
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_persona');
    const engineColumn = table?.findColumnByName('engine');
    if (engineColumn && !engineColumn.type.includes('varchar')) {
      await queryRunner.changeColumn(
        'virtual_persona',
        'engine',
        new TableColumn({
          name: 'engine',
          type: 'varchar',
          length: '128',
          isNullable: false,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_persona');
    const engineColumn = table?.findColumnByName('engine');
    if (engineColumn && engineColumn.type.includes('varchar')) {
      await queryRunner.changeColumn(
        'virtual_persona',
        'engine',
        new TableColumn({
          name: 'engine',
          type: 'text',
          isNullable: false,
        })
      );
    }
  }
}
