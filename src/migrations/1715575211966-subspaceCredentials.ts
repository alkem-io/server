import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaceCredentials1715575211966 implements MigrationInterface {
  name = 'subspaceCredentials1715575211966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // All credentials need to be updated to reflect the new type
    await queryRunner.query(`
      UPDATE credential
      SET type = REPLACE(type, 'subspace-', 'space-')
      WHERE type LIKE '%subspace-%';
    `);

    // And the community policies
    await queryRunner.query(`
      UPDATE community_policy
      SET member = REPLACE(member, 'subspace-', 'space-')
      WHERE member LIKE '%subspace-%'
    `);

    await queryRunner.query(`
      UPDATE community_policy
      SET \`lead\` = REPLACE(\`lead\`, 'subspace-', 'space-')
      WHERE \`lead\` LIKE '%subspace-%'
    `);

    await queryRunner.query(`
      UPDATE community_policy
      SET admin = REPLACE(admin, 'subspace-', 'space-')
      WHERE admin LIKE '%subspace-%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
