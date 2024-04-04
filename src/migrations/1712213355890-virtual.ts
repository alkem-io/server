import { MigrationInterface, QueryRunner } from 'typeorm';

export class virtual1712213355890 implements MigrationInterface {
  name = 'virtual1712213355890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`virtual\` (\`id\` char(36) NOT NULL,
                                                         \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                         \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                         \`version\` int NOT NULL, \`nameID\` varchar(255) NOT NULL,
                                                         \`prompt\` text NULL,
                                                         \`authorizationId\` char(36) NULL,
                                                         \`profileId\` char(36) NULL,
                                                         \`agentId\` char(36) NULL,
                                                         \`storageAggregatorId\` char(36) NULL,
                                                         UNIQUE INDEX \`REL_a1a11662383fefcb81416116a6\` (\`authorizationId\`),
                                                         UNIQUE INDEX \`REL_7b8b29a41564c268b864bc85ff\` (\`profileId\`),
                                                         UNIQUE INDEX \`REL_c947646f184a6f7aeee68be999\` (\`agentId\`),
                                                         UNIQUE INDEX \`REL_29a529635a2b2db9f37ca6d352\` (\`storageAggregatorId\`),
                                                         PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`virtual\` ADD CONSTRAINT \`FK_a1a11662383fefcb81416116a6c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` ADD CONSTRAINT \`FK_7b8b29a41564c268b864bc85ff2\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` ADD CONSTRAINT \`FK_c947646f184a6f7aeee68be9998\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` ADD CONSTRAINT \`FK_29a529635a2b2db9f37ca6d3521\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual\` DROP FOREIGN KEY \`FK_29a529635a2b2db9f37ca6d3521\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` DROP FOREIGN KEY \`FK_c947646f184a6f7aeee68be9998\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` DROP FOREIGN KEY \`FK_7b8b29a41564c268b864bc85ff2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual\` DROP FOREIGN KEY \`FK_a1a11662383fefcb81416116a6c\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_29a529635a2b2db9f37ca6d352\` ON \`virtual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c947646f184a6f7aeee68be999\` ON \`virtual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7b8b29a41564c268b864bc85ff\` ON \`virtual\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a1a11662383fefcb81416116a6\` ON \`virtual\``
    );
    await queryRunner.query(`DROP TABLE \`virtual\``);
  }
}
