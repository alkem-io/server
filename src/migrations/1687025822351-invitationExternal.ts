import { MigrationInterface, QueryRunner } from 'typeorm';

export class invitationExternal1687025822351 implements MigrationInterface {
  name = 'invitationExternal1687025822351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`invitation_external\` (\`id\` char(36) NOT NULL,
                                             \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                             \`version\` int NOT NULL, \`email\` varchar(255) NOT NULL,
                                             \`firstName\` varchar(255) NULL, \`lastName\` varchar(255) NULL,
                                             \`createdBy\` char(36) NULL, \`welcomeMessage\` varchar(512) NULL,
                                             \`profileCreated\` tinyint NOT NULL DEFAULT 0,
                                             \`authorizationId\` char(36) NULL,
                                             \`communityId\` char(36) NULL,
                                             UNIQUE INDEX \`REL_42a7abc9f297ffcacb53087da8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_42a7abc9f297ffcacb53087da88\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_2a985f774bd4de2a9aead6bd5b1\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE  SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` DROP FOREIGN KEY \`FK_2a985f774bd4de2a9aead6bd5b1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` DROP FOREIGN KEY \`FK_42a7abc9f297ffcacb53087da88\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_42a7abc9f297ffcacb53087da8\` ON \`invitation_external\``
    );
    await queryRunner.query(`DROP TABLE \`invitation_external\``);
  }
}
