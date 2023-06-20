import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addStorageBucketRelation,
  allowedTypes,
  createStorageBucketAndLink,
  maxAllowedFileSize,
  removeStorageBucketAuths,
  removeStorageBucketRelation,
} from './utils/storage/storage-bucket-utils';
export class storage1681736452222 implements MigrationInterface {
  name = 'storage1681736452222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create storage space entity
    await queryRunner.query(
      `CREATE TABLE \`storage_bucket\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                 \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` char(36) NULL,
                  \`allowedMimeTypes\` TEXT NULL,
                  \`maxFileSize\` int NULL,
                  \`parentStorageBucketId\` char(36) NULL,
                    UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` (\`authorizationId\`),
                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_77755901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create calendar_events
    await queryRunner.query(
      `CREATE TABLE \`document\` (\`id\` char(36) NOT NULL,
                     \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                     \`createdBy\` char(36) NULL,
                      \`version\` int NOT NULL,
                      \`authorizationId\` char(36) NULL,
                      \`storageBucketId\` char(36) NULL,
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
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await addStorageBucketRelation(
      queryRunner,
      'FK_11991450cf75dc486700ca034c6',
      'hub'
    );
    await addStorageBucketRelation(
      queryRunner,
      'FK_21991450cf75dc486700ca034c6',
      'challenge'
    );
    await addStorageBucketRelation(
      queryRunner,
      'FK_31991450cf75dc486700ca034c6',
      'platform'
    );
    await addStorageBucketRelation(
      queryRunner,
      'FK_41991450cf75dc486700ca034c6',
      'library'
    );
    await addStorageBucketRelation(
      queryRunner,
      'FK_51991450cf75dc486700ca034c6',
      'organization'
    );

    // Allow every profile to know the StorageBucket to use
    // TODO: enforce this to be a valid value or not? What happens if storagebucket is deleted?
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`storageBucketId\` char(36) NULL`
    );

    const hubs: { id: string }[] = await queryRunner.query(
      `SELECT id FROM hub`
    );
    for (const hub of hubs) {
      await createStorageBucketAndLink(
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
      const hubs: { id: string; storageBucketId: string }[] =
        await queryRunner.query(
          `SELECT id, storageBucketId FROM hub WHERE (id = '${challenge.hubID}')`
        );
      if (hubs.length !== 1) {
        throw new Error(`Found challenge without hubID set: ${challenge.id}`);
      }
      const hub = hubs[0];
      await createStorageBucketAndLink(
        queryRunner,
        'challenge',
        challenge.id,
        allowedTypes,
        maxAllowedFileSize,
        hub.storageBucketId
      );
    }

    const platforms: { id: string }[] = await queryRunner.query(
      `SELECT id FROM platform`
    );
    const platform = platforms[0];
    const platformStorageBucketId = await createStorageBucketAndLink(
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
    const libraryStorageBucket = await createStorageBucketAndLink(
      queryRunner,
      'library',
      library.id,
      allowedTypes,
      maxAllowedFileSize,
      platformStorageBucketId
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // storage_bucket ==> authorization
    await queryRunner.query(
      'ALTER TABLE `storage_bucket` DROP FOREIGN KEY `FK_77755901817dd09d5906537e088`'
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
    // document ==> storage_bucket
    await queryRunner.query(
      'ALTER TABLE `document` DROP FOREIGN KEY `FK_11155450cf75dc486700ca034c6`'
    );

    await removeStorageBucketAuths(queryRunner, [
      'hub',
      'challenge',
      'platform',
      'library',
      'organization',
    ]);
    await removeStorageBucketRelation(
      queryRunner,
      'FK_11991450cf75dc486700ca034c6',
      'hub'
    );
    await removeStorageBucketRelation(
      queryRunner,
      'FK_21991450cf75dc486700ca034c6',
      'challenge'
    );
    await removeStorageBucketRelation(
      queryRunner,
      'FK_31991450cf75dc486700ca034c6',
      'platform'
    );
    await removeStorageBucketRelation(
      queryRunner,
      'FK_41991450cf75dc486700ca034c6',
      'library'
    );
    await removeStorageBucketRelation(
      queryRunner,
      'FK_51991450cf75dc486700ca034c6',
      'organization'
    );

    await queryRunner.query('DROP TABLE `storage_bucket`');
    await queryRunner.query('DROP TABLE `document`');

    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`storageBucketId\``
    );
  }
}
