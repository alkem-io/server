import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1738233483679 implements MigrationInterface {
  name = 'FixBaseline1738233483679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_857684833bbd26eff72f97bcfd\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_40f3ebb0c2a0b2a1557e67f849\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`credential\` \`credential\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`parentCredentials\` \`parentCredentials\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`userPolicy\` \`userPolicy\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`organizationPolicy\` \`organizationPolicy\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`virtualContributorPolicy\` \`virtualContributorPolicy\` json NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`virtualContributorPolicy\` \`virtualContributorPolicy\` json NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`organizationPolicy\` \`organizationPolicy\` json NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`userPolicy\` \`userPolicy\` json NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`parentCredentials\` \`parentCredentials\` json NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE \`credential\` \`credential\` json NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_40f3ebb0c2a0b2a1557e67f849\` ON \`platform\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_857684833bbd26eff72f97bcfd\` ON \`organization\` (\`roleSetId\`)`
    );
  }
}
