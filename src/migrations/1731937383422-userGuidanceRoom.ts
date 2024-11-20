import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserGuidanceRoom1731937383422 implements MigrationInterface {
  name = 'UserGuidanceRoom1731937383422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Guidance Room to user
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`guidanceRoomId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_67c9d8c51a7033bbe9355f7609\` ON \`user\` (\`guidanceRoomId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_67c9d8c51a7033bbe9355f76095\` FOREIGN KEY (\`guidanceRoomId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Add Guidance VC to platform
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`guidanceVirtualContributorId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8e78677ceea32e003ff23d463d\` ON \`platform\` (\`guidanceVirtualContributorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_8e78677ceea32e003ff23d463dd\` FOREIGN KEY (\`guidanceVirtualContributorId\`) REFERENCES \`virtual_contributor\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // TODO: Maybe add a new Virtual Contributor for guidance here? or will be set manually in the platform
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_67c9d8c51a7033bbe9355f76095\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_67c9d8c51a7033bbe9355f7609\` ON \`user\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`guidanceRoomId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_8e78677ceea32e003ff23d463dd\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8e78677ceea32e003ff23d463d\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`guidanceVirtualContributorId\``
    );
  }
}
