import { MigrationInterface, QueryRunner } from 'typeorm';

export class innovationSpace1680102566781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`selection_criteria\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`selection_filter\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(255) NOT NULL, \`value\` varchar(255) NOT NULL, \`selectionCriteriaId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`branding\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`styles\` text NULL, \`logoId\` varchar(36) NULL, UNIQUE INDEX \`REL_2131374899e661a319659e48ed\` (\`logoId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`innovation_space\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`description\` text NULL, \`authorizationId\` varchar(36) NULL, \`profileId\` varchar(36) NULL, \`selectionCriteriaId\` varchar(36) NULL, \`organizationId\` varchar(36) NULL, \`brandingId\` varchar(36) NULL, UNIQUE INDEX \`REL_69503638dad11b28081aa11a87\` (\`authorizationId\`), UNIQUE INDEX \`REL_1dfeddbcbd97e3a052b62bbbc3\` (\`profileId\`), UNIQUE INDEX \`REL_d0ee4040ea8ff06d269c0507da\` (\`selectionCriteriaId\`), UNIQUE INDEX \`REL_5d8718b531b9b701d90159ddb8\` (\`organizationId\`), UNIQUE INDEX \`REL_c7f7ab0964b33595ba98513ea8\` (\`brandingId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`selection_filter\` ADD CONSTRAINT \`FK_34b78059a6841d5e97c3d787079\` FOREIGN KEY (\`selectionCriteriaId\`) REFERENCES \`selection_criteria\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`branding\` ADD CONSTRAINT \`FK_2131374899e661a319659e48ed3\` FOREIGN KEY (\`logoId\`) REFERENCES \`visual\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` ADD CONSTRAINT \`FK_69503638dad11b28081aa11a870\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` ADD CONSTRAINT \`FK_1dfeddbcbd97e3a052b62bbbc35\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` ADD CONSTRAINT \`FK_d0ee4040ea8ff06d269c0507da2\` FOREIGN KEY (\`selectionCriteriaId\`) REFERENCES \`selection_criteria\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` ADD CONSTRAINT \`FK_5d8718b531b9b701d90159ddb85\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` ADD CONSTRAINT \`FK_c7f7ab0964b33595ba98513ea83\` FOREIGN KEY (\`brandingId\`) REFERENCES \`branding\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` DROP FOREIGN KEY \`FK_c7f7ab0964b33595ba98513ea83\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` DROP FOREIGN KEY \`FK_5d8718b531b9b701d90159ddb85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` DROP FOREIGN KEY \`FK_d0ee4040ea8ff06d269c0507da2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` DROP FOREIGN KEY \`FK_1dfeddbcbd97e3a052b62bbbc35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_space\` DROP FOREIGN KEY \`FK_69503638dad11b28081aa11a870\``
    );
    await queryRunner.query(
      `ALTER TABLE \`branding\` DROP FOREIGN KEY \`FK_2131374899e661a319659e48ed3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`selection_filter\` DROP FOREIGN KEY \`FK_34b78059a6841d5e97c3d787079\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c7f7ab0964b33595ba98513ea8\` ON \`innovation_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5d8718b531b9b701d90159ddb8\` ON \`innovation_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d0ee4040ea8ff06d269c0507da\` ON \`innovation_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dfeddbcbd97e3a052b62bbbc3\` ON \`innovation_space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_69503638dad11b28081aa11a87\` ON \`innovation_space\``
    );
    await queryRunner.query(`DROP TABLE \`innovation_space\``);
    await queryRunner.query(
      `DROP INDEX \`REL_2131374899e661a319659e48ed\` ON \`branding\``
    );
    await queryRunner.query(`DROP TABLE \`branding\``);
    await queryRunner.query(`DROP TABLE \`selection_filter\``);
    await queryRunner.query(`DROP TABLE \`selection_criteria\``);
  }
}
