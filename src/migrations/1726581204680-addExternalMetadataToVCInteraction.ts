import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalMetadataToVCInteraction1726581204680
  implements MigrationInterface
{
  name = 'AddExternalMetadataToVCInteraction1726581204680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` ADD \`externalMetadata\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` DROP COLUMN \`externalMetadata\``
    );
  }
}
