import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class subspaceAdmin1715661558908 implements MigrationInterface {
  name = 'subspaceAdmin1715661558908';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const spaceAdminCredentials: {
      id: string;
      resourceID: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type FROM credential where type = 'space-admin'`
    );
    for (const spaceAdminCredential of spaceAdminCredentials) {
      // try to look up the account
      const [space]: { id: string; level: number; parentSpaceId: string }[] =
        await queryRunner.query(
          `SELECT id, level, parentSpaceId FROM space WHERE id = '${spaceAdminCredential.resourceID}'`
        );
      if (!space) {
        console.log(
          `Unable to find space for space admin credential ${spaceAdminCredential.id}`
        );
      }
      if (!space || !space.level || space.level === 0) {
        continue;
      }
      const subspaceAdminCredID = randomUUID();
      const resourceID = space.parentSpaceId; // assigning the credential to the parent space
      await queryRunner.query(
        `INSERT INTO credential (id, version, resourceID, type) VALUES ('${subspaceAdminCredID}', 1, '${resourceID}', 'subspace-admin')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
