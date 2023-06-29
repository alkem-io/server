import { MigrationInterface, QueryRunner } from 'typeorm';

export class primaryIdsTypeMigrated1687782644019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    ); // authorizationId
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    ); // profileId

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`id\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`authorizationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`profileId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    ); // authorizationId
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    ); // profileId

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`id\` varchar(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`authorizationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`profileId\` varchar(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
