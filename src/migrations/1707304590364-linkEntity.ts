import { MigrationInterface, QueryRunner } from 'typeorm';

export class linkEntity1707304590364 implements MigrationInterface {
  name = 'linkEntity1707304590364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`link\` (\`id\` char(36) NOT NULL,
                                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                    \`version\` int NOT NULL,
                                                    \`uri\` text NOT NULL,
                                                    \`authorizationId\` char(36) NULL,
                                                    \`profileId\` char(36) NULL,
                                                    UNIQUE INDEX \`REL_07f249ac87502495710a62c5c0\` (\`authorizationId\`),
                                                    UNIQUE INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` (\`profileId\`),
                                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_07f249ac87502495710a62c5c01\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_3bfc8c1aaec1395cc148268d3cd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const contributions: {
      id: string;
      linkId: string;
    }[] = await queryRunner.query(
      `SELECT id, linkId FROM callout_contribution`
    );
    for (const contribution of contributions) {
      if (contribution.linkId) {
        // move the data
      }
    }
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_3bfc8c1aaec1395cc148268d3cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_07f249ac87502495710a62c5c01\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` ON \`link\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_07f249ac87502495710a62c5c0\` ON \`link\``
    );
    await queryRunner.query(`DROP TABLE \`link\``);
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`reference\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
