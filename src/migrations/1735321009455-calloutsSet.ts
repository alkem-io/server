import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutsSet1735321009455 implements MigrationInterface {
  name = 'CalloutsSet1735321009455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
    );
    await queryRunner.query(`CREATE TABLE \`callouts_set\` (\`id\` char(36) NOT NULL,
                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                \`version\` int NOT NULL,
                                                \`groupsStr\` text NOT NULL,
                                                \`authorizationId\` char(36) NULL,
                                                \`tagsetTemplateSetId\` char(36) NULL,
                                                UNIQUE INDEX \`REL_8f3fd7a83451183166aac4ad02\` (\`authorizationId\`),
                                                UNIQUE INDEX \`REL_211515f7e21e93136a6b905e84\` (\`tagsetTemplateSetId\`),
                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`calloutsSetId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`calloutsSetId\` char(36) NULL`
    );

    // Create calloutsSet for each collaboration
    const collaborations: {
      id: string;
      groupsStr: string;
      tagsetTemplateSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, groupsStr, tagsetTemplateSetId FROM \`collaboration\``
    );
    for (const collaboration of collaborations) {
      const calloutsSetID = await this.createCalloutsSet(
        queryRunner,
        collaboration.groupsStr,
        collaboration.tagsetTemplateSetId
      );
      await queryRunner.query(
        `UPDATE \`collaboration\` SET calloutsSetId = '${calloutsSetID}' WHERE id = '${collaboration.id}'`
      );
      // update all the callouts to point to the new calloutsSet
      await queryRunner.query(
        `UPDATE \`callout\` SET calloutsSetId = '${calloutsSetID}' WHERE collaborationId = '${collaboration.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`groupsStr\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`tagsetTemplateSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`collaborationId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_9e1ebbc0972fa354d33b67a1a0\` (\`calloutsSetId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9e1ebbc0972fa354d33b67a1a0\` ON \`collaboration\` (\`calloutsSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_08d3fa19eb35058446dafa99192\` FOREIGN KEY (\`calloutsSetId\`) REFERENCES \`callouts_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` ADD CONSTRAINT \`FK_8f3fd7a83451183166aac4ad02f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` ADD CONSTRAINT \`FK_211515f7e21e93136a6b905e84a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_9e1ebbc0972fa354d33b67a1a02\` FOREIGN KEY (\`calloutsSetId\`) REFERENCES \`callouts_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private async createCalloutsSet(
    queryRunner: QueryRunner,
    groupsStr: string,
    tagsetTemplateSetId: string
  ): Promise<string> {
    const calloutsSetID = randomUUID();
    const calloutsSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'callouts-set'
    );
    await queryRunner.query(
      `INSERT INTO callouts_set (id, version, authorizationId, tagsetTemplateSetId, groupsStr) VALUES
                    (
                    '${calloutsSetID}',
                    1,
                    '${calloutsSetAuthID}',
                    '${tagsetTemplateSetId}',
                    '${groupsStr}')`
    );
    return calloutsSetID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                    ('${authID}',
                    1, '[]', '[]', 0, '[]', '${policyType}')`
    );
    return authID;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_9e1ebbc0972fa354d33b67a1a02\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` DROP FOREIGN KEY \`FK_211515f7e21e93136a6b905e84a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` DROP FOREIGN KEY \`FK_8f3fd7a83451183166aac4ad02f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_08d3fa19eb35058446dafa99192\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9e1ebbc0972fa354d33b67a1a0\` ON \`collaboration\``
    );

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_9e1ebbc0972fa354d33b67a1a0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`calloutsSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`tagsetTemplateSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`groupsStr\` text NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_211515f7e21e93136a6b905e84\` ON \`callouts_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8f3fd7a83451183166aac4ad02\` ON \`callouts_set\``
    );
    await queryRunner.query(`DROP TABLE \`callouts_set\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` CHANGE \`calloutsSetId\` \`collaborationId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\` (\`tagsetTemplateSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_b7ece56376ac7ca0b9a56c33b3a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }
}
