import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class storageAggregation1697135794050 implements MigrationInterface {
  name = 'storageAggregation1697135794050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    // Space ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_11991450cf75dc486700ca034c6\``
    );
    // Challenge ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_21991450cf75dc486700ca034c6\``
    );
    // Organization ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_51991450cf75dc486700ca034c6\``
    );
    // User ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_12341450cf75dc486700ca034c6\``
    );
    // Platform ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_31991450cf75dc486700ca034c6\``
    );
    // Library ==> StorageBucket
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_41991450cf75dc486700ca034c6\``
    );

    // Create new structures
    await queryRunner.query(`CREATE TABLE \`storage_aggregator\` (
                                  \`id\` char(36) NOT NULL,
                                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                  \`version\` int NOT NULL, \`authorizationId\` char(36) NULL,
                                  \`parentStorageAggregatorId\` char(36) NULL,
                                  \`directStorageId\` char(36) NULL,
                                  UNIQUE INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` (\`authorizationId\`),
                                  UNIQUE INDEX \`REL_0647707288c243e60091c8d862\` (\`directStorageId\`),
                                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_1114d59c0b805c9c1ecb0070e16',
      'space'
    );
    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_2224d59c0b805c9c1ecb0070e16',
      'challenge'
    );
    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_3334d59c0b805c9c1ecb0070e16',
      'organization'
    );
    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_4444d59c0b805c9c1ecb0070e16',
      'user'
    );
    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_5554d59c0b805c9c1ecb0070e16',
      'platform'
    );
    await this.addStorageAggregatorToEntityDefintion(
      queryRunner,
      'FK_6664d59c0b805c9c1ecb0070e16',
      'library'
    );

    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD \`storageAggregatorId\` char(36) NULL`
    );

    // Migrate data
    const spaces: {
      id: string;
      storageBucketId: string;
    }[] = await queryRunner.query(`SELECT id, storageBucketId FROM space`);
    for (const space of spaces) {
      const spaceStorageAggregatorID =
        await this.createStorageAggregatorOnEntity(
          queryRunner,
          'space',
          space.id,
          null,
          space.storageBucketId
        );

      await this.updateStorageBucketsAggregation(
        queryRunner,
        space.storageBucketId,
        spaceStorageAggregatorID
      );

      const challenges: {
        id: string;
        storageBucketId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageBucketId FROM challenge WHERE challenge.spaceId = '${space.id}'`
      );
      for (const challenge of challenges) {
        const challengeStorageAggregatorID =
          await this.createStorageAggregatorOnEntity(
            queryRunner,
            'challenge',
            challenge.id,
            spaceStorageAggregatorID,
            challenge.storageBucketId
          );
        await this.updateStorageBucketsAggregation(
          queryRunner,
          challenge.storageBucketId,
          challengeStorageAggregatorID
        );
      }
    }

    await this.migrateStorageAggregationOnEntity(queryRunner, 'organization');
    await this.migrateStorageAggregationOnEntity(queryRunner, 'user');
    await this.migrateStorageAggregationOnEntity(queryRunner, 'library');
    await this.migrateStorageAggregationOnEntity(queryRunner, 'platform');

    // Add new constraints
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_f3b4d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_b80c28f5335ab5442f63c644d94\` FOREIGN KEY (\`parentStorageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_0647707288c243e60091c8d8620\` FOREIGN KEY (\`directStorageId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Drop old data / structures
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`storageBucketId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`storageBucketId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    // storage aggregator ==> directStorage
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_0647707288c243e60091c8d8620\``
    );
    // storage aggregator ==> parentyStorageAggregator
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_b80c28f5335ab5442f63c644d94\``
    );
    // storage aggregator ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_f3b4d59c0b805c9c1ecb0070e16\``
    );
    //Space ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_1114d59c0b805c9c1ecb0070e16\``
    );
    // Challenge ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_2224d59c0b805c9c1ecb0070e16\``
    );
    // Organization ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_3334d59c0b805c9c1ecb0070e16\``
    );
    // User ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_4444d59c0b805c9c1ecb0070e16\``
    );
    // Platform ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_5554d59c0b805c9c1ecb0070e16\``
    );
    // Library ==> storageAggregator
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_6664d59c0b805c9c1ecb0070e16\``
    );

    // Create new structures
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_11991450cf75dc486700ca034c6',
      'space'
    );
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_21991450cf75dc486700ca034c6',
      'challenge'
    );
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_51991450cf75dc486700ca034c6',
      'organization'
    );
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_12341450cf75dc486700ca034c6',
      'user'
    );
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_41991450cf75dc486700ca034c6',
      'library'
    );
    await this.addStorageBucketRelation(
      queryRunner,
      'FK_31991450cf75dc486700ca034c6',
      'platform'
    );

    // Migrate data

    // TODO

    // Add new constraints

    // Drop old data / structures
    await queryRunner.query(
      `DROP INDEX \`REL_0647707288c243e60091c8d862\` ON \`storage_aggregator\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` ON \`storage_aggregator\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(`DROP TABLE \`storage_aggregator\``);
  }

  private async addStorageAggregatorToEntityDefintion(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD \`storageAggregatorId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private async migrateStorageAggregationOnEntity(
    queryRunner: QueryRunner,
    entityTable: string
  ) {
    const entities: {
      id: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId FROM ${entityTable}`
    );
    for (const entity of entities) {
      const entityStorageAggregatorID =
        await this.createStorageAggregatorOnEntity(
          queryRunner,
          entityTable,
          entity.id,
          null,
          entity.storageBucketId
        );

      await this.updateStorageBucketsAggregation(
        queryRunner,
        entity.storageBucketId,
        entityStorageAggregatorID
      );
    }
  }

  private async createStorageAggregatorOnEntity(
    queryRunner: QueryRunner,
    entityTable: string,
    entityID: string,
    parentStorageAggregatorID: string | null,
    directStorageId: string
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${storageAggregatorAuthID}',
        1, '', '', 0, '')`
    );

    if (parentStorageAggregatorID) {
      await queryRunner.query(
        `INSERT INTO storage_aggregator (id, version, authorizationId, parentStorageAggregatorId, directStorageId)
              VALUES ('${storageAggregatorID}',
                      '1',
                      '${storageAggregatorAuthID}',
                      '${parentStorageAggregatorID}',
                      '${directStorageId}')`
      );
    } else {
      await queryRunner.query(
        `INSERT INTO storage_aggregator (id, version, authorizationId, directStorageId)
              VALUES ('${storageAggregatorID}',
                      '1',
                      '${storageAggregatorAuthID}',
                      '${directStorageId}')`
      );
    }

    await queryRunner.query(
      `UPDATE \`${entityTable}\` SET storageAggregatorId = '${storageAggregatorID}' WHERE (id = '${entityID}')`
    );
    return storageAggregatorID;
  }

  private async updateStorageBucketsAggregation(
    queryRunner: QueryRunner,
    oldParentStorageBucketId: string,
    storageAggregatorID: string
  ) {
    const storageBuckets: {
      id: string;
      parentStorageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT id, parentStorageBucketId FROM storage_bucket WHERE storage_bucket.id = '${oldParentStorageBucketId}'`
    );
    for (const storageBucket of storageBuckets) {
      await queryRunner.query(
        `UPDATE \`storage_bucket\` SET storageAggregatorId = '${storageAggregatorID}' WHERE (id = '${storageBucket.id}')`
      );
    }
  }

  private async addStorageBucketRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD \`storageBucketId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
