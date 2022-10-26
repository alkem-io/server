import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationAssociates1666637892473 implements MigrationInterface {
  name = 'organizationAssociates1666637892473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const credentials: any[] = await queryRunner.query(
      `SELECT id, type from credential`
    );
    for (const credential of credentials) {
      if (credential.type === 'organization-member') {
        await queryRunner.query(
          `UPDATE \`credential\` SET \`type\` = 'organization-associate' WHERE \`id\`= '${credential.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const credentials: any[] = await queryRunner.query(
      `SELECT id, type from credential`
    );
    for (const credential of credentials) {
      if (credential.type === 'organization-associate') {
        await queryRunner.query(
          `UPDATE \`credential\` SET \`type\` = 'organization-member' WHERE \`id\`= '${credential.id}'`
        );
      }
    }
  }
}
