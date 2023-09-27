import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutLocation1695296600518 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE tagset SET tags = 'HOME_2' WHERE tags = 'HOME_0'`
    );
    await queryRunner.query(
      `UPDATE tagset_template SET defaultSelectedValue = 'HOME_2' WHERE defaultSelectedValue = 'HOME_0'`
    );
    const tagsetTemplates = await queryRunner.query(
      `SELECT * FROM tagset_template`
    );

    for (const tagsetTemplate of tagsetTemplates) {
      const tagsetTemplateArray = tagsetTemplate.allowedValues.split(',');

      // Check if "HOME_2" is not in the array, replace "HOME_0" with "HOME_2"
      if (!tagsetTemplateArray.includes('HOME_2')) {
        const updatedArray = tagsetTemplateArray.map((value: string) =>
          value === 'HOME_0' ? 'HOME_2' : value
        );

        const tagsetTemplateString = updatedArray.join(',');
        console.log(tagsetTemplateString);

        await queryRunner.query(
          `UPDATE tagset_template SET allowedValues = ? WHERE id = ?`,
          [tagsetTemplateString, tagsetTemplate.id]
        );
      } else {
        // Remove "HOME_0" from the array
        const updatedArray = tagsetTemplateArray.filter(
          (value: string) => value !== 'HOME_0'
        );

        const tagsetTemplateString = updatedArray.join(',');
        console.log(tagsetTemplateString);

        await queryRunner.query(
          `UPDATE tagset_template SET allowedValues = ? WHERE id = ?`,
          [tagsetTemplateString, tagsetTemplate.id]
        );
      }
    }
    await queryRunner.query(
      `UPDATE callout SET sortOrder = 1 WHERE type = 'link-collection' AND nameID = 'getting-started' AND sortOrder = 3`
    );
    await queryRunner.query(
      `UPDATE callout SET sortOrder = 1 WHERE type = 'link-collection' AND nameID = 'recommendations' AND sortOrder = 3`
    );
    await queryRunner.query(
      `UPDATE callout SET sortOrder = 2 WHERE type = 'post-collection' AND nameID = 'contributor-profiles' AND sortOder = 1`
    );
    await queryRunner.query(
      `UPDATE callout SET sortOrder = 2 WHERE type = 'post-collection' AND nameID = 'tasks' AND sortOrder = 1`
    );
    await queryRunner.query(
      `UPDATE callout SET sortOrder = 3 WHERE type = 'post' AND nameID = 'roles' AND sortOrder = 2`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
