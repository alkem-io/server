import { MigrationInterface, QueryRunner } from 'typeorm';

export class templatesSet1653580239006 implements MigrationInterface {
  name = 'templatesSet1653580239006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`templates_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL,
               \`authorizationId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`templatesSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_66666355b4e9bd6b02c66507aa\` (\`templatesSetId\`)`
    );

    await queryRunner.query(
      `CREATE TABLE \`aspect_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`title\` varchar(255) NOT NULL, \`templatesSetId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`aspect_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
