import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmptyCalloutReferenceName1743578542843
  implements MigrationInterface
{
  private readonly DEFAULT_NAME = 'default'; // Define your default name here

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find all references that match the criteria
    const referencesToUpdate = await queryRunner.query(
      `SELECT cf.id, r.createdDate
         FROM reference AS r
         JOIN profile AS p ON r.profileId = p.id
         JOIN callout_framing AS cf ON cf.profileId = p.id
         WHERE r.name = ''`
    );

    if (referencesToUpdate.length > 0) {
      // Update the references with the default name
      await queryRunner.query(
        `UPDATE reference
             SET name = ?
             WHERE name = ''`,
        [this.DEFAULT_NAME]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the changes if needed
    // You might want to reset the names back to their original state
    // This is just an example of how you might revert the changes
    await queryRunner.query(
      `UPDATE reference
         SET name = ''
         WHERE name = ?`,
      [this.DEFAULT_NAME]
    );
  }
}
