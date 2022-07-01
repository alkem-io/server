import { MigrationInterface, QueryRunner } from 'typeorm';
import { alterColumnType } from './utils/alterColumnType';

export class nvpFieldTypeChange1656333455328 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await alterColumnType(queryRunner, 'nvp', 'value', 'varchar(512)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await alterColumnType(queryRunner, 'nvp', 'value', 'varchar(255)');
  }
}
