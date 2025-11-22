import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaGallery1763816289774 implements MigrationInterface {
  name = 'MediaGallery1763816289774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`media_gallery\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`createdBy\` char(36) NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_e0ee9bf6142bc19e9eff263824\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`mediaGalleryId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD \`mediaGalleryId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_471fa4cb18d52aafe50e51dfe1\` (\`mediaGalleryId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_471fa4cb18d52aafe50e51dfe1\` ON \`callout_framing\` (\`mediaGalleryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`media_gallery\` ADD CONSTRAINT \`FK_e0ee9bf6142bc19e9eff2638245\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_f7d0fd686fb8aec91868c548f62\` FOREIGN KEY (\`mediaGalleryId\`) REFERENCES \`media_gallery\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_471fa4cb18d52aafe50e51dfe11\` FOREIGN KEY (\`mediaGalleryId\`) REFERENCES \`media_gallery\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_471fa4cb18d52aafe50e51dfe11\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_f7d0fd686fb8aec91868c548f62\``
    );
    await queryRunner.query(
      `ALTER TABLE \`media_gallery\` DROP FOREIGN KEY \`FK_e0ee9bf6142bc19e9eff2638245\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_471fa4cb18d52aafe50e51dfe1\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_471fa4cb18d52aafe50e51dfe1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP COLUMN \`mediaGalleryId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP COLUMN \`mediaGalleryId\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e0ee9bf6142bc19e9eff263824\` ON \`media_gallery\``
    );
    await queryRunner.query(`DROP TABLE \`media_gallery\``);
  }
}
