import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const allowedTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'application/pdf',
];

const maxAllowedFileSize = 5242880;

export class storage1681736452222 implements MigrationInterface {
  name = 'storage1681736452222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create storage space entity
    await queryRunner.query(
      `CREATE TABLE \`storage_space\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                 \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` char(36) NULL,
                  \`allowedMimeTypes\` TEXT NULL,
                  \`maxFileSize\` int NULL,
                  \`parentStorageSpaceId\` char(36) NULL,
                    UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` (\`authorizationId\`),
                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_space\` ADD CONSTRAINT \`FK_77755901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create calendar_events
    await queryRunner.query(
      `CREATE TABLE \`document\` (\`id\` char(36) NOT NULL,
                     \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                     \`createdBy\` char(36) NULL,
                      \`version\` int NOT NULL,
                      \`authorizationId\` char(36) NULL,
                      \`storageSpaceId\` char(36) NULL,
                      \`displayName\` varchar(255) NULL,
                      \`tagsetId\` char(36) NULL,
                      \`mimeType\` varchar(36) NULL,
                      \`size\` int NULL,
                      \`externalID\` varchar(128) NULL,
                      PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_222838434c7198a323ea6f475fb\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_3337f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Link documents to storage space
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155450cf75dc486700ca034c6\` FOREIGN KEY (\`storageSpaceId\`) REFERENCES \`storage_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await this.addStorageSpaceRelation(
      queryRunner,
      'FK_11991450cf75dc486700ca034c6',
      'hub'
    );
    await this.addStorageSpaceRelation(
      queryRunner,
      'FK_21991450cf75dc486700ca034c6',
      'challenge'
    );
    await this.addStorageSpaceRelation(
      queryRunner,
      'FK_31991450cf75dc486700ca034c6',
      'platform'
    );
    await this.addStorageSpaceRelation(
      queryRunner,
      'FK_41991450cf75dc486700ca034c6',
      'library'
    );

    // Allow every profile to know the StorageSpace to use
    // TODO: enforce this to be a valid value or not? What happens if storagespace is deleted?
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`storageSpaceId\` char(36) NULL`
    );

    const hubs: { id: string }[] = await queryRunner.query(
      `SELECT id FROM hub`
    );
    for (const hub of hubs) {
      await this.createStorageSpaceAndLink(
        queryRunner,
        'hub',
        hub.id,
        allowedTypes,
        maxAllowedFileSize,
        ''
      );
    }

    const challenges: { id: string; hubID: string }[] = await queryRunner.query(
      `SELECT id, hubID FROM challenge`
    );
    for (const challenge of challenges) {
      const hubs: { id: string; storageSpaceId: string }[] =
        await queryRunner.query(
          `SELECT id, storageSpaceId FROM hub WHERE (id = '${challenge.hubID}}');
      }`
        );
      if (hubs.length !== 1) {
        throw new Error(`Found challenge without hubID set: ${challenge.id}`);
      }
      const hub = hubs[0];
      await this.createStorageSpaceAndLink(
        queryRunner,
        'challenge',
        challenge.id,
        allowedTypes,
        maxAllowedFileSize,
        hub.storageSpaceId
      );
    }

    const platforms: { id: string }[] = await queryRunner.query(
      `SELECT id FROM platform`
    );
    const platform = platforms[0];
    const platformStorageSpaceId = await this.createStorageSpaceAndLink(
      queryRunner,
      'platform',
      platform.id,
      allowedTypes,
      maxAllowedFileSize,
      ''
    );

    const libraries: { id: string }[] = await queryRunner.query(
      `SELECT id FROM library`
    );
    const library = libraries[0];
    const libraryStorageSpace = await this.createStorageSpaceAndLink(
      queryRunner,
      'library',
      library.id,
      allowedTypes,
      maxAllowedFileSize,
      platformStorageSpaceId
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // storage_space ==> authorization
    await queryRunner.query(
      'ALTER TABLE `storage_space` DROP FOREIGN KEY `FK_77755901817dd09d5906537e088`'
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

    await this.removeStorageSpaceRelation(
      queryRunner,
      'FK_11991450cf75dc486700ca034c6',
      'hub'
    );
    await this.removeStorageSpaceRelation(
      queryRunner,
      'FK_21991450cf75dc486700ca034c6',
      'challenge'
    );
    await this.removeStorageSpaceRelation(
      queryRunner,
      'FK_31991450cf75dc486700ca034c6',
      'platform'
    );
    await this.removeStorageSpaceRelation(
      queryRunner,
      'FK_41991450cf75dc486700ca034c6',
      'library'
    );

    await queryRunner.query('DROP TABLE `storage_space`');
    await queryRunner.query('DROP TABLE `document`');

    // TODO: enforce this to be a valid value or not? What happens if storagespace is deleted?
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`storageSpaceId\``
    );
  }

  public async addStorageSpaceRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD \`storageSpaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`storageSpaceId\`) REFERENCES \`storage_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async removeStorageSpaceRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${entityTable} DROP FOREIGN KEY ${fk}`
    );
    await queryRunner.query(
      `ALTER TABLE ${entityTable} DROP COLUMN storageSpaceId`
    );
  }

  private async createStorageSpaceAndLink(
    queryRunner: QueryRunner,
    entityTable: string,
    entityID: string,
    allowedMimeTypes: string[],
    maxFileSize: number,
    parentStorageSpaceID: string
  ): Promise<string> {
    const newStorageSpaceID = randomUUID();
    const storageSpaceAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${storageSpaceAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_space (id, version, authorizationId, allowedMimeTypes, maxFileSize, parentStorageSpaceId)
            VALUES ('${newStorageSpaceID}',
                    '1',
                    '${storageSpaceAuthID}',
                    '${allowedMimeTypes}',
                    ${maxFileSize},
                    '${parentStorageSpaceID}')`
    );

    await queryRunner.query(
      `UPDATE \`${entityTable}\` SET storageSpaceId = '${newStorageSpaceID}' WHERE (id = '${entityID}')`
    );
    return newStorageSpaceID;
  }
}
