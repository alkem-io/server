import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class recommendations1671129430163 implements MigrationInterface {
  name = 'recommendations1671129430163';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update where references point to, first dropping FK to aspect
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`contextRecommendationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_299938434c7198a323ea6f475fb\` FOREIGN KEY (\`contextRecommendationId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Migrate the data
    const contexts: { id: string }[] = await queryRunner.query(
      `SELECT id from context`
    );
    for (const context of contexts) {
      // create recommendations authorization
      for (let i = 1; i <= 3; i++) {
        const authID = randomUUID();
        const recommendationID = randomUUID();

        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO reference (id, createdDate, updatedDate, version, authorizationId, contextRecommendationId, name, uri)
             VALUES ('${recommendationID}', NOW(), NOW(), 1, '${authID}', '${context.id}', 'recommendation${i}', '')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_299938434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`contextRecommendationId\``
    );
  }
}
