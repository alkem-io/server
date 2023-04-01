import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const allowedTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];

const maxAllowedFileSize = 5242880;

export class storage1680341687350 implements MigrationInterface {
  name = 'storage1680341687350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create storage space entity
    await queryRunner.query(
      `CREATE TABLE \`storage_space\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                 \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` char(36) NULL,
                  \`allowedMimeTypes\` TEXT NULL,
                  \`maxSize\` int NULL,
                    UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` (\`authorizationId\`),
                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_space\` ADD CONSTRAINT \`FK_77755901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      'ALTER TABLE `hub` ADD `storageSpaceId` char(36) NULL'
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_11991450cf75dc486700ca034c6\` FOREIGN KEY (\`storageSpaceId\`) REFERENCES \`storage_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create calendar_events
    await queryRunner.query(
      `CREATE TABLE \`document\` (\`id\` char(36) NOT NULL,
                     \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                     \`createdBy\` char(36) NULL,
                      \`version\` int NOT NULL,
                      \`authorizationId\` char(36) NULL,
                      \`nameID\` varchar(36) NOT NULL,
                      \`storageSpaceId\` char(36) NULL,
                      \`profileId\` char(36) NULL,
                      \`mimeType\` varchar(36) NULL,
                      \`size\` int NULL,
                      \`externalID\` varchar(128) NULL,
                      PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_222838434c7198a323ea6f475fb\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_3337f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Link documents to storage space
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155450cf75dc486700ca034c6\` FOREIGN KEY (\`storageSpaceId\`) REFERENCES \`storage_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const hubs: { id: string }[] = await queryRunner.query(
      `SELECT id FROM hub`
    );
    for (const hub of hubs) {
      // create calendar instance with authorization
      const storageSpaceAuthID = randomUUID();
      const storageSpaceID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${storageSpaceAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO storage_space (id, createdDate, updatedDate, version, authorizationId, allowedMimeTypes, maxFileSize) VALUES ('${storageSpaceID}', NOW(), NOW(), 1, '${storageSpaceAuthID}', '${allowedTypes}', '${maxAllowedFileSize}' )`
      );
      await queryRunner.query(
        `UPDATE hub SET storageSpaceId = '${storageSpaceID}' WHERE id = '${hub.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // storage_space ==> authorization
    await queryRunner.query(
      'ALTER TABLE `storage_space` DROP FOREIGN KEY `FK_77755901817dd09d5906537e088`'
    );
    // hub ==> storage_space
    await queryRunner.query(
      'ALTER TABLE `hub` DROP FOREIGN KEY `FK_11991450cf75dc486700ca034c6`'
    );
    // document ==> authorization
    await queryRunner.query(
      'ALTER TABLE `document` DROP FOREIGN KEY `FK_11155901817dd09d5906537e088`'
    );
    // document ==> profile
    await queryRunner.query(
      'ALTER TABLE `document` DROP FOREIGN KEY `FK_222838434c7198a323ea6f475fb`'
    );
    // document ==> user
    await queryRunner.query(
      'ALTER TABLE `document` DROP FOREIGN KEY `FK_3337f26ca267009fcf514e0e726`'
    );
    // document ==> storage_space
    await queryRunner.query(
      'ALTER TABLE `document` DROP FOREIGN KEY `FK_11155450cf75dc486700ca034c6`'
    );

    // note: do not bother to cascade delete on new entities

    await queryRunner.query('DROP TABLE `storage_space`');
    await queryRunner.query('DROP TABLE `document`');

    await queryRunner.query('ALTER TABLE `hub` DROP COLUMN `storageSpaceId`');
  }
}
