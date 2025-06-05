import { MigrationInterface, QueryRunner } from 'typeorm';

export class CollaborativeDocument1748748800000 implements MigrationInterface {
  name = 'CollaborativeDocument1748748800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`collaborative_document\` (
        \`id\` char(36) NOT NULL,
        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`version\` int NOT NULL,
        \`documentName\` varchar(512) NOT NULL,
        \`content\` longtext NULL,
        \`yDocState\` longblob NULL,
        \`documentType\` varchar(512) NULL,
        \`lastModified\` timestamp NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_collaborative_document_name\` (\`documentName\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_collaborative_document_name\` ON \`collaborative_document\``
    );
    await queryRunner.query(`DROP TABLE \`collaborative_document\``);
  }
}
