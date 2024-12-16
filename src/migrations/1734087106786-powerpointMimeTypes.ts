import { MigrationInterface, QueryRunner } from 'typeorm';

export class PowerpointMimeTypes1734087106786 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const mimeTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
      'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.template',
      'application/vnd.ms-powerpoint.template.macroEnabled.12',
      'application/vnd.oasis.opendocument.presentation',
    ];

    for (const mimeType of mimeTypes) {
      await queryRunner.query(`
        UPDATE storage_bucket
        SET allowedMimeTypes =
          CASE
            WHEN allowedMimeTypes IS NULL OR allowedMimeTypes = '' THEN '${mimeType}'
            ELSE CONCAT(allowedMimeTypes, ',${mimeType}')
          END
        WHERE FIND_IN_SET('${mimeType}', allowedMimeTypes) = 0;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration needed');
  }
}
