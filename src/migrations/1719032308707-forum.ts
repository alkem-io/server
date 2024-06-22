import { MigrationInterface, QueryRunner } from 'typeorm';

export class forum1719032308707 implements MigrationInterface {
  name = 'forum1719032308707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`forum\` (
                                    \`id\` char(36) NOT NULL,
                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                    \`version\` int NOT NULL,
                                    \`discussionCategories\` text NOT NULL,
                                    \`authorizationId\` char(36) NULL,
                                    UNIQUE INDEX \`REL_3b0c92945f36d06f37de80285d\` (\`authorizationId\`),
                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`forumId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`forumId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_dd88d373c64b04e24705d575c9\` (\`forumId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dd88d373c64b04e24705d575c9\` ON \`platform\` (\`forumId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_0de78853c1ee793f61bda7eff79\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` ADD CONSTRAINT \`FK_3b0c92945f36d06f37de80285dd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_dd88d373c64b04e24705d575c99\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_c6a084fe80d01c41d9f142d51aa\` `
    );

    // communicationId
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_55333901817dd09d5906537e088\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_3eb4c1d5063176a184485399f1\` ON \`platform\``
    );

    const [platform]: {
      id: string;
      communicationId: string;
    }[] = await queryRunner.query(`SELECT id, communicationId FROM platform`);
    if (platform) {
      const [communication]: {
        id: string;
        authorizationId: string;
        discussionCategories: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId, discussionCategories FROM communication where id = '${platform.communicationId}'`
      );
      if (communication) {
        await queryRunner.query(
          `INSERT INTO forum (id, version, discussionCategories, authorizationId) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            communication.id, // id
            1, // version
            communication.discussionCategories, // discussionCategories
            communication.authorizationId, // authorizationId
          ]
        );
        // Move over all the Discussions
        await queryRunner.query(
          `UPDATE discussion SET forumId = '${communication.id}' WHERE communicationId = '${platform.communicationId}'`
        );
        // and also remove data in communicationId
        await queryRunner.query(
          `UPDATE discussion SET communicationId = '' WHERE communicationId = '${platform.communicationId}'`
        );

        // delete the communication
        await queryRunner.query(
          `DELETE FROM communication WHERE id = '${platform.communicationId}'`
        );
      }
    }

    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`discussionCategories\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`communicationId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
