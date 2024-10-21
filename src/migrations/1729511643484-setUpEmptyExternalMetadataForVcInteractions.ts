import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetUpEmptyExternalMetadataForVcInteractions1729511643484
  implements MigrationInterface
{
  name = 'SetUpEmptyExternalMetadataForVcInteractions1729511643484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`vc_interaction\` SET \`externalMetadata\` = '{}' WHERE externalMetadata IS NULL OR externalMetadata = ''`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
