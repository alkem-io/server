import { MigrationInterface, QueryRunner } from 'typeorm';

export class tagsetNames1689087486575 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all records from 'tagset'
    const tagsets = await queryRunner.query(`SELECT * FROM tagset`);

    // Iterate through each record
    for (const tagset of tagsets) {
      // Check if 'tags' field is a JSON array
      let tagsString;
      if (this.isJsonArray(tagset.tags)) {
        // If it is a JSON array, parse it and convert to comma-separated string
        const tagsArray = JSON.parse(tagset.tags);
        tagsString = tagsArray.join(',');
      } else {
        // If it is not a JSON array, use it as it is
        tagsString = tagset.tags;
      }

      // Update the 'tags' field with new value
      await queryRunner.query(`UPDATE tagset SET tags = ? WHERE id = ?`, [
        tagsString,
        tagset.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Migration 'tagsetNames1689087486575' is not revertible. Please make sure you have a backup of your data before running this migration."
    );
  }

  private isJsonArray(str: string): boolean {
    try {
      const json = JSON.parse(str);
      return Array.isArray(json);
    } catch (e) {
      return false;
    }
  }
}
