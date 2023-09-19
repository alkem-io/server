import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutTemplate1693849043894 implements MigrationInterface {
  name = 'calloutTemplate1693849043894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`callout_framing\` (
                  \`id\` char(36) NOT NULL,
                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` char(36) NULL,
                  \`profileId\` char(36) NULL,
                  \`content\` longtext NOT NULL,
                  UNIQUE INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` (\`authorizationId\`), UNIQUE INDEX \`REL_f53e2d266432e58e538a366705\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution_defaults\` (
                  \`id\` char(36) NOT NULL,
                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`postDescription\` text NULL,
                  \`whiteboardContent\` longtext NOT NULL,
                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution_policy\` (
                  \`id\` char(36) NOT NULL,
                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`allowedContributionTypes\` text NOT NULL,
                  \`state\` varchar(255) NOT NULL,
                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_template\` (
                  \`id\` char(36) NOT NULL,
                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` char(36) NULL,
                  \`profileId\` char(36) NULL,
                  \`templatesSetId\` char(36) NULL,
                  \`framingId\` char(36) NULL,
                  \`contributionDefaultsId\` char(36) NULL,
                  \`contributionPolicyId\` char(36) NULL,
                  UNIQUE INDEX \`REL_6c90723f8f1424e2dd08dddb39\` (\`authorizationId\`), UNIQUE INDEX \`REL_75d5ced6c2e92cbbb5d8d0a913\` (\`profileId\`), UNIQUE INDEX \`REL_b94beb9cefe0a8814dceddd10f\` (\`framingId\`), UNIQUE INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` (\`contributionDefaultsId\`), UNIQUE INDEX \`REL_bffd07760b73be1aad13b6d00c\` (\`contributionPolicyId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_c9d7c2c4eb8a1d012ddc6605da9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_f53e2d266432e58e538a366705d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_6c90723f8f1424e2dd08dddb393\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_75d5ced6c2e92cbbb5d8d0a913e\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_7c434491e8e9ee8af12caff7db3\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_b94beb9cefe0a8814dceddd10f6\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_83bbc10ba2ddee4502bf327f1f5\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` ADD CONSTRAINT \`FK_bffd07760b73be1aad13b6d00c3\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_bffd07760b73be1aad13b6d00c3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_83bbc10ba2ddee4502bf327f1f5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_b94beb9cefe0a8814dceddd10f6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_7c434491e8e9ee8af12caff7db3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_75d5ced6c2e92cbbb5d8d0a913e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_template\` DROP FOREIGN KEY \`FK_6c90723f8f1424e2dd08dddb393\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_f53e2d266432e58e538a366705d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_c9d7c2c4eb8a1d012ddc6605da9\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_bffd07760b73be1aad13b6d00c\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b94beb9cefe0a8814dceddd10f\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_75d5ced6c2e92cbbb5d8d0a913\` ON \`callout_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6c90723f8f1424e2dd08dddb39\` ON \`callout_template\``
    );
    await queryRunner.query(`DROP TABLE \`callout_template\``);
    await queryRunner.query(`DROP TABLE \`callout_contribution_policy\``);
    await queryRunner.query(`DROP TABLE \`callout_contribution_defaults\``);
    await queryRunner.query(
      `DROP INDEX \`REL_f53e2d266432e58e538a366705\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` ON \`callout_framing\``
    );
    await queryRunner.query(`DROP TABLE \`callout_framing\``);
  }
}
