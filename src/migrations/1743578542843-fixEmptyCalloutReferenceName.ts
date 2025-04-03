import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmptyCalloutReferenceName1743578542843
  implements MigrationInterface
{
  private readonly DEFAULT_NAME = 'default'; // Define your default name here

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE reference
             SET name = ?
             WHERE name = ''`,
      [this.DEFAULT_NAME]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'Rollback not implemented for FixEmptyCalloutReferenceName1743578542843 migration - migration will not be reversible!'
    );
  }
}
