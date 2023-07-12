import { MigrationInterface, QueryRunner } from 'typeorm';

export class tagsetNames1689087486575 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tagsets = await queryRunner.query(`SELECT * FROM tagset`);

    for (const tagset of tagsets) {
      let tagsString;
      if (this.isJsonArray(tagset.tags)) {
        const tagsArray = JSON.parse(tagset.tags);
        tagsString = tagsArray.join(',');
      } else {
        tagsString = tagset.tags;
      }

      await queryRunner.query(`UPDATE tagset SET tags = ? WHERE id = ?`, [
        tagsString,
        tagset.id,
      ]);
    }

    const tagsetTemplates = await queryRunner.query(
      `SELECT * FROM tagset_template`
    );

    for (const tagsetTemplate of tagsetTemplates) {
      let tagsetTemplateString;
      if (this.isJsonArray(tagsetTemplate.allowedValues)) {
        const tagsetTemplateArray = JSON.parse(tagsetTemplate.allowedValues);
        tagsetTemplateString = tagsetTemplateArray.join(',');
      } else {
        tagsetTemplateString = tagsetTemplate.allowedValues;
      }

      await queryRunner.query(
        `UPDATE tagset_template SET allowedValues = ? WHERE id = ?`,
        [tagsetTemplateString, tagsetTemplate.id]
      );
    }

    const flowStateTagsets = await queryRunner.query(`
      SELECT t.*, tt.defaultSelectedValue
      FROM tagset t
      INNER JOIN tagset_template tt
      ON t.tagsetTemplateId = tt.id
      WHERE t.name = 'flow-state'
    `);

    // Iterate through each record
    for (const tagset of flowStateTagsets) {
      // Update the 'tags' field with new value
      await queryRunner.query(`UPDATE tagset SET tags = ? WHERE id = ?`, [
        tagset.defaultSelectedValue,
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
