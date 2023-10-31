import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeGuidanceLog1698411586135 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `chat_guidance_log` DROP FOREIGN KEY `FK_4387b26ca267009fef514e0e726`'
    );
    await queryRunner.query('DROP TABLE `chat_guidance_log`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`chat_guidance_log\` (\`id\` char(36) NOT NULL,
      \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`createdBy\` char(36) NULL,
      \`version\` int NOT NULL,
      \`question\` text NOT NULL,
      \`answer\` text NOT NULL,
      \`promptTokens\` int NOT NULL,
      \`completionTokens\` int NOT NULL,
      \`totalTokens\` int NOT NULL,
      \`totalCost\` float NOT NULL,
      \`sources\` text NULL,
       PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`chat_guidance_log\` ADD CONSTRAINT \`FK_4387b26ca267009fef514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
