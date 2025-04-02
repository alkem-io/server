import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmptyCalloutReferenceName1743578542843
  implements MigrationInterface
{
  private readonly DEFAULT_NAME = 'default'; // Define your default name here

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find all references that match the criteria
    const referencesToUpdate: { id: string }[] = await queryRunner.query(
      `SELECT r.id as id
         FROM reference AS r
         JOIN profile AS p ON r.profileId = p.id
         JOIN callout_framing AS cf ON cf.profileId = p.id
         WHERE r.name = ''`
    );

    if (referencesToUpdate && referencesToUpdate.length > 0) {
      const referenceIDsToUpdate = referencesToUpdate.map(ref => ref.id);
      // Update the references with the default name
      await queryRunner.query(
        `UPDATE reference
             SET name = ?
             WHERE name = '' AND id IN (?)`,
        [this.DEFAULT_NAME, referenceIDsToUpdate]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'Rollback not implemented for FixEmptyCalloutReferenceName1743578542843 migration - migration will not be reversible!'
    );
  }
}
