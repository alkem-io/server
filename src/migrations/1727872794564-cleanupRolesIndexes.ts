import { MigrationInterface, QueryRunner } from 'typeorm';
import { safelyDropFK } from './utils/safely-drop-foreignKey';
import { safelyDropIndex } from './utils/safely-drop-index';
import { safelyAddFK } from './utils/safely-add-foreignKey';

export class cleanupRolesIndexes1727872794564 implements MigrationInterface {
  name = 'cleanupRolesIndexes1727872794564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // platform_invitation
    // This is the new FK using the old index
    safelyDropFK(
      queryRunner,
      'platform_invitation',
      'FK_562dce4a08bb214f08107b3631e'
    );

    // This is the old index that needs to be removed
    safelyDropIndex(
      queryRunner,
      'platform_invitation',
      'FK_b3d3f3c2ce851d1059c4ed26ba2'
    );

    // This will add the index and the FK back
    safelyAddFK(
      queryRunner,
      'platform_invitation',
      'FK_562dce4a08bb214f08107b3631e',
      'roleSetId',
      'role_set',
      'id',
      'CASCADE',
      'NO ACTION'
    );

    // application

    safelyDropFK(queryRunner, 'application', 'FK_8fb220ad1ac1f9c86ec39d134e4');
    safelyDropIndex(
      queryRunner,
      'application',
      'FK_500cee6f635849f50e19c7e2b76'
    );
    safelyAddFK(
      queryRunner,
      'application',
      'FK_8fb220ad1ac1f9c86ec39d134e4',
      'roleSetId',
      'role_set',
      'id',
      'CASCADE',
      'NO ACTION'
    );

    // invitation
    safelyDropFK(queryRunner, 'invitation', 'FK_6a3b86c6db10582baae7058f5b9');
    safelyDropIndex(
      queryRunner,
      'invitation',
      'FK_339c1fe2a9c5caef5b982303fb0'
    );
    safelyAddFK(
      queryRunner,
      'invitation',
      'FK_6a3b86c6db10582baae7058f5b9',
      'roleSetId',
      'role_set',
      'id',
      'CASCADE',
      'NO ACTION'
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
