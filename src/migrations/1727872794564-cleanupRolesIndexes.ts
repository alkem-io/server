import { MigrationInterface, QueryRunner } from 'typeorm';

export class cleanupRolesIndexes1727872794564 implements MigrationInterface {
  name = 'cleanupRolesIndexes1727872794564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // platform_invitation
    // This is the new FK using the old index
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_562dce4a08bb214f08107b3631e\``
    );
    // This is the old index that needs to be removed
    await queryRunner.query(
      `DROP INDEX \`FK_b3d3f3c2ce851d1059c4ed26ba2\` ON \`platform_invitation\`
    `
    );
    // This will add the index and the FK back
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_562dce4a08bb214f08107b3631e\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `
    );

    // application
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_8fb220ad1ac1f9c86ec39d134e4\``
    );
    await queryRunner.query(
      `DROP INDEX \`FK_500cee6f635849f50e19c7e2b76\` ON \`application\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_8fb220ad1ac1f9c86ec39d134e4\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // invitation
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_6a3b86c6db10582baae7058f5b9\``
    );
    await queryRunner.query(
      `DROP INDEX \`FK_339c1fe2a9c5caef5b982303fb0\` ON \`invitation\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_6a3b86c6db10582baae7058f5b9\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // leave the FK just add back that wrong index to platform_invitation table
    await queryRunner.query(
      `CREATE INDEX \`FK_b3d3f3c2ce851d1059c4ed26ba2\` ON \`platform_invitation\` (\`roleSetId\`)`
    );

    // leave the FK just add back that wrong index to application table
    await queryRunner.query(
      `CREATE INDEX \`FK_500cee6f635849f50e19c7e2b76\` ON \`application\` (\`roleSetId\`)`
    );

    // leave the FK just add back that wrong index to invitation table
    await queryRunner.query(
      `CREATE INDEX \`FK_339c1fe2a9c5caef5b982303fb0\` ON \`invitation\` (\`roleSetId\`)`
    );
  }
}
