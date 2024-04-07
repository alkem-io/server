import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class virtual1712213355890 implements MigrationInterface {
  name = 'virtual1712213355890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`virtual_persona\` (\`id\` char(36) NOT NULL,
                                          \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                          \`version\` int NOT NULL,
                                          \`nameID\` varchar(255) NOT NULL,
                                          \`engine\` text NOT NULL,
                                          \`prompt\` text NOT NULL,
                                          \`authorizationId\` char(36) NULL,
                                          \`profileId\` char(36) NULL,
                                          \`storageAggregatorId\` char(36) NULL,
                                          UNIQUE INDEX \`REL_e5b04476330916a9dac3d87e52\` (\`authorizationId\`),
                                          UNIQUE INDEX \`REL_f5b93c5a204483c3563c7c434a\` (\`profileId\`),
                                          UNIQUE INDEX \`REL_a6a9c0a62d17b6737eeb90b790\` (\`storageAggregatorId\`),
                                          PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`virtual_contributor\` (\`id\` char(36) NOT NULL,
                                          \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                          \`version\` int NOT NULL, \`nameID\` varchar(255) NOT NULL,
                                          \`authorizationId\` char(36) NULL,
                                          \`profileId\` char(36) NULL,
                                          \`agentId\` char(36) NULL,
                                          \`storageAggregatorId\` char(36) NULL,
                                          \`virtualPersonaId\` char(36) NULL,
                                          UNIQUE INDEX \`REL_a1a11662383fefcb81416116a6\` (\`authorizationId\`),
                                          UNIQUE INDEX \`REL_7b8b29a41564c268b864bc85ff\` (\`profileId\`),
                                          UNIQUE INDEX \`REL_c947646f184a6f7aeee68be999\` (\`agentId\`),
                                          UNIQUE INDEX \`REL_29a529635a2b2db9f37ca6d352\` (\`storageAggregatorId\`),
                                          UNIQUE INDEX \`REL_5c6f158a128406aafb9808b3a8\` (\`virtualPersonaId\`),
                                          PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_a1a11662383fefcb81416116a6c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7b8b29a41564c268b864bc85ff2\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_c947646f184a6f7aeee68be9998\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_29a529635a2b2db9f37ca6d3521\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_5c6f158a128406aafb9808b3a82\` FOREIGN KEY (\`virtualPersonaId\`) REFERENCES \`virtual_persona\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD CONSTRAINT \`FK_e5b04476330916a9dac3d87e529\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD CONSTRAINT \`FK_f5b93c5a204483c3563c7c434a4\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD CONSTRAINT \`FK_a6a9c0a62d17b6737eeb90b7903\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    // Update all the licenses to add a feature flag for the usage of virtual contributors in a space
    const licenses: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM license`);

    for (const license of licenses) {
      const featureFlagUUID = randomUUID();
      await queryRunner.query(
        `INSERT INTO feature_flag (id, version, licenseId, name, enabled) VALUES
                      ('${featureFlagUUID}',
                      1,
                      '${license.id}',
                      'virtual-contributors',
                      0)`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
