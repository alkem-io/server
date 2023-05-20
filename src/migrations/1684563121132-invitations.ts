import { MigrationInterface, QueryRunner } from 'typeorm';

export class invitations1684563121132 implements MigrationInterface {
  name = 'invitations1684563121132';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`invitation\` (\`id\` varchar(36) NOT NULL,
                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                    \`version\` int NOT NULL,
                                    \`invitedUser\` char(36) NULL,
                                    \`invitedBy\` char(36) NULL,
                                    \`authorizationId\` varchar(36) NULL,
                                    \`lifecycleId\` varchar(36) NULL,
                                    \`communityId\` varchar(36) NULL,
                                    UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` (\`authorizationId\`),
                                    UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`),
                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_339c1fe2a9c5caef5b982303fb0\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_339c1fe2a9c5caef5b982303fb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(`DROP TABLE \`invitation\``);
  }
}
