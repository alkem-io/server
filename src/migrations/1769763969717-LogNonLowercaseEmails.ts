import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogNonLowercaseEmails1769763969717 implements MigrationInterface {
  name = 'LogNonLowercaseEmails1769763969717';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Detect duplicate emails (same email, different casing)
    const duplicates = await queryRunner.query(`
        SELECT LOWER(email) AS lower_email, COUNT(*) AS cnt
        FROM "user"
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      `);

    if (duplicates.length > 0) {
      console.warn(
        `[Migration] Found ${duplicates.length} email(s) with case-sensitive duplicates:`
      );
      for (const dup of duplicates) {
        const users = await queryRunner.query(
          `SELECT id, email, "updatedDate" FROM "user" WHERE LOWER(email) = $1 ORDER BY "updatedDate" ASC`,
          [dup.lower_email]
        );
        console.warn(
          `[Migration]  ${dup.lower_email}: ${users.map((u: { id: string; email: string }) => `${u.email} (${u.id})`).join(', ')}`
        );
      }
      console.warn('[Migration] Duplicated accounts must be resolved manually');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
