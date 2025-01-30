import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformVcSettings1738002827561 implements MigrationInterface {
  name = 'PlatformVcSettings1738002827561';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`settings\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`settings\` json NOT NULL`
    );

    await queryRunner.query(
      `UPDATE \`virtual_contributor\` SET settings = '${JSON.stringify(virtualContributorSettingsDefault)}'`
    );
    await queryRunner.query(
      `UPDATE \`platform\` SET settings = '${JSON.stringify(platformSettingsDefault)}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`settings\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`settings\``
    );
  }
}

const virtualContributorSettingsDefault = {
  privacy: {
    knowledgeBaseContentVisible: false,
  },
};

const platformSettingsDefault = {
  integration: {
    iframeAllowedUrls: [
      'https://issuu.com',
      'https://www.youtube.com',
      'https://player.vimeo.com',
      'https://www.canva.com',
      'https://demo.arcade.software',
    ],
  },
};
