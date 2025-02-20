import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceAbout1739609759793 implements MigrationInterface {
  name = 'SpaceAbout1739609759793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b4250035291aac1329d59224a96\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_cc0b08eb9679d3daa95153c2af5\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\``
    );
    await queryRunner.query(`CREATE TABLE \`space_about\` (\`id\` char(36) NOT NULL,
                                                               \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                               \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                               \`version\` int NOT NULL,
                                                               \`why\` text NULL,
                                                               \`who\` text NULL,
                                                               \`authorizationId\` char(36) NULL,
                                                               \`profileId\` char(36) NULL,
                                                               UNIQUE INDEX \`REL_8ce1fdaa7405b062b0102ce5f1\` (\`authorizationId\`),
                                                               UNIQUE INDEX \`REL_35584de03c66d9d473cbbe9d37\` (\`profileId\`),
                                                               PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`aboutId\` char(36) NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_a03169c3f86480ba3863924f4d7`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_5f0dbc3b097ef297bd5f4ddb1a9`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_658580aea4e1a892227e27db902`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_cbb1d7afa052a184471723d3297`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_0f9d41ee193d631a5439bb4f404`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
    );

    // Migrate the data
    const spaces: {
      id: string;
      contextId: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, contextId, profileId FROM \`space\``
    );
    for (const space of spaces) {
      const [context]: {
        id: string;
        who: string;
        vision: string;
        impact: string;
      }[] = await queryRunner.query(
        `SELECT id, who, vision, impact FROM context WHERE id = ?`,
        [space.contextId]
      );
      const [profile]: {
        id: string;
        description: string;
      }[] = await queryRunner.query(
        `SELECT id, description FROM profile WHERE id = ?`,
        [space.profileId]
      );
      const origImpact = context.impact;
      const origVision = context.vision;
      const origWho = context.who;
      const origDescription = profile.description;

      const newWhy = `${origImpact} \n====== Impact === ${origVision}`;
      const newDescription = `${origDescription}`;

      const aboutID = randomUUID();
      const aboutAuthID = await this.createAuthorizationPolicy(
        queryRunner,
        'space-about'
      );
      await queryRunner.query(
        `INSERT INTO space_about (id, version, why, who, authorizationId, profileId) VALUES
                            ('${aboutID}',
                            1,
                            '${newWhy}',
                            '${origWho}',
                            '${aboutAuthID}',
                            '${space.profileId}')`
      );
      // Update the profile description
      await queryRunner.query(
        `UPDATE profile SET description = '${newDescription}' WHERE id = ?`,
        [profile.id]
      );
      await queryRunner.query(
        `UPDATE \`space\` SET aboutId = '${aboutID}' WHERE id = ?`,
        [space.id]
      );
    }

    // Delete the actor, actor group and ecosystem entities + data
    const actors: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(`SELECT id, authorizationId FROM \`actor\``);
    for (const actor of actors) {
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        actor.authorizationId,
      ]);
    }

    const actorGroups: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`actor_group\``
    );
    for (const group of actorGroups) {
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        group.authorizationId,
      ]);
    }

    const ecosystemModels: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`ecosystem_model\``
    );
    for (const model of ecosystemModels) {
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        model.authorizationId,
      ]);
    }

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`profileId\``);
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_c59c1beb254808dd32007de661\` (\`aboutId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c59c1beb254808dd32007de661\` ON \`space\` (\`aboutId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` ADD CONSTRAINT \`FK_8ce1fdaa7405b062b0102ce5f12\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` ADD CONSTRAINT \`FK_35584de03c66d9d473cbbe9d372\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_c59c1beb254808dd32007de6617\` FOREIGN KEY (\`aboutId\`) REFERENCES \`space_about\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Drop the following tables: actor, actor_group, ecosystem_model
    await queryRunner.query(`DROP TABLE \`context\``);
    await queryRunner.query(`DROP TABLE \`actor\``);
    await queryRunner.query(`DROP TABLE \`actor_group\``);
    await queryRunner.query(`DROP TABLE \`ecosystem_model\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_c59c1beb254808dd32007de6617\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` DROP FOREIGN KEY \`FK_35584de03c66d9d473cbbe9d372\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` DROP FOREIGN KEY \`FK_8ce1fdaa7405b062b0102ce5f12\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c59c1beb254808dd32007de661\` ON \`space\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_c59c1beb254808dd32007de661\``
    );
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`aboutId\``);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`contextId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_35584de03c66d9d473cbbe9d37\` ON \`space_about\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8ce1fdaa7405b062b0102ce5f1\` ON \`space_about\``
    );
    await queryRunner.query(`DROP TABLE \`space_about\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\` (\`contextId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_cc0b08eb9679d3daa95153c2af5\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b4250035291aac1329d59224a96\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                          ('${authID}',
                          1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }
}
