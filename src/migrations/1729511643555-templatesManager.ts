import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class TemplatesManager1729511643555 implements MigrationInterface {
  name = 'TemplatesManager1729511643555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_43559aeadc1a5169d17e81b3d45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );

    await queryRunner.query(`CREATE TABLE \`template_default\` (
        \`id\` char(36) NOT NULL,
        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`version\` int NOT NULL,
        \`type\` varchar(128) NOT NULL,
        \`allowedTemplateType\` varchar(128) NOT NULL,
        \`authorizationId\` char(36) NULL,
        \`templatesManagerId\` char(36) NULL,
        \`templateId\` char(36) NULL,
        UNIQUE INDEX \`REL_9dbeb9326140b3ce01c1037efe\` (\`authorizationId\`),
        UNIQUE INDEX \`REL_b6617b64c6ea8ebb24947ddbd4\` (\`templateId\`),
        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`templates_manager\` (
        \`id\` char(36) NOT NULL,
        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`version\` int NOT NULL,
        \`authorizationId\` char(36) NULL,
        \`templatesSetId\` char(36) NULL,
        UNIQUE INDEX \`REL_19ea19263c6016f411fb008243\` (\`authorizationId\`),
        UNIQUE INDEX \`REL_7ba875eee72ec5fcbe2355124d\` (\`templatesSetId\`),
        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`templatesManagerId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_81f92b22d30540102e9654e892\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_81f92b22d30540102e9654e892\` ON \`platform\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`templatesManagerId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_dea52ce918df6950019678fa35\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dea52ce918df6950019678fa35\` ON \`space\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`isTemplate\` tinyint NOT NULL DEFAULT 0`
    );

    const levelZeroSpaces: {
      id: string;
      libraryId: string;
    }[] = await queryRunner.query(
      `SELECT id, libraryId FROM \`space\` where level = 0`
    );
    for (const space of levelZeroSpaces) {
      const templatesManagerID = await this.createTemplatesManager(
        queryRunner,
        space.libraryId
      );
      await queryRunner.query(
        `UPDATE \`space\` SET templatesManagerId = '${templatesManagerID}' WHERE id = '${space.id}'`
      );
      // create the template defaults
      await this.createTemplateDefault(
        queryRunner,
        templatesManagerID,
        TemplateDefaultType.SPACE_SUBSPACE,
        TemplateType.COLLABORATION
      );
    }

    const platformTemplatesManagerID = await this.createTemplatesManager(
      queryRunner,
      undefined
    );
    await queryRunner.query(
      `UPDATE \`platform\` SET templatesManagerId = '${platformTemplatesManagerID}'`
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SPACE_TUTORIALS,
      TemplateType.COLLABORATION
    );
    await this.createTemplateDefault(
      queryRunner,
      platformTemplatesManagerID,
      TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE,
      TemplateType.COLLABORATION
    );

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`defaultsId\``);
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`libraryId\``);
    await queryRunner.query(
      `ALTER TABLE \`template_default\` ADD CONSTRAINT \`FK_9dbeb9326140b3ce01c1037efee\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_default\` ADD CONSTRAINT \`FK_c1135fa45c07ba625e1db9f93bd\` FOREIGN KEY (\`templatesManagerId\`) REFERENCES \`templates_manager\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template_default\` ADD CONSTRAINT \`FK_b6617b64c6ea8ebb24947ddbd45\` FOREIGN KEY (\`templateId\`) REFERENCES \`template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_manager\` ADD CONSTRAINT \`FK_19ea19263c6016f411fb0082437\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_manager\` ADD CONSTRAINT \`FK_7ba875eee72ec5fcbe2355124df\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_81f92b22d30540102e9654e892c\` FOREIGN KEY (\`templatesManagerId\`) REFERENCES \`templates_manager\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_dea52ce918df6950019678fa355\` FOREIGN KEY (\`templatesManagerId\`) REFERENCES \`templates_manager\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(`DROP TABLE \`space_defaults\``);
  }

  private async createTemplatesManager(
    queryRunner: QueryRunner,
    templatesSetInputId: string | undefined
  ): Promise<string> {
    const templatesManagerID = randomUUID();
    const templatesManagerAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'templates_manager'
    );
    let templatesSetID = templatesSetInputId;
    if (!templatesSetID) {
      templatesSetID = await this.createTemplatesSet(queryRunner);
    }

    // create the new templates manager
    await queryRunner.query(
      `INSERT INTO templates_manager (id, version, authorizationId, templatesSetId) VALUES
              (
              '${templatesManagerID}',
              1,
              '${templatesManagerAuthID}',
              '${templatesSetID}')`
    );

    return templatesManagerID;
  }

  private async createTemplatesSet(queryRunner: QueryRunner): Promise<string> {
    const templatesSetID = randomUUID();
    const templatesSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'templates_set'
    );
    // create the new templates set
    await queryRunner.query(
      `INSERT INTO templates_set (id, version, authorizationId) VALUES
              (
              '${templatesSetID}',
              1,
              '${templatesSetAuthID}')`
    );
    return templatesSetID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
              ('${authID}',
              1, '', '', 0, '', '${policyType}')`
    );
    return authID;
  }

  private async createTemplateDefault(
    queryRunner: QueryRunner,
    templatesManagerID: string,
    templateDefaultType: TemplateDefaultType,
    allowedTemplateType: TemplateType
  ): Promise<string> {
    const templateDefaultID = randomUUID();
    const templateDefaultAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'template_default'
    );
    await queryRunner.query(
      `INSERT INTO template_default (id, version, type, allowedTemplateType, authorizationId, templatesManagerId) VALUES
              (
              '${templateDefaultID}',
              1,
              '${templateDefaultType}',
              '${allowedTemplateType}',
              '${templateDefaultAuthID}',
              '${templatesManagerID}')`
    );
    return templateDefaultID;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_dea52ce918df6950019678fa355\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_81f92b22d30540102e9654e892c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_manager\` DROP FOREIGN KEY \`FK_7ba875eee72ec5fcbe2355124df\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_manager\` DROP FOREIGN KEY \`FK_19ea19263c6016f411fb0082437\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_default\` DROP FOREIGN KEY \`FK_b6617b64c6ea8ebb24947ddbd45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_default\` DROP FOREIGN KEY \`FK_c1135fa45c07ba625e1db9f93bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template_default\` DROP FOREIGN KEY \`FK_9dbeb9326140b3ce01c1037efee\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dea52ce918df6950019678fa35\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_81f92b22d30540102e9654e892\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_dea52ce918df6950019678fa35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`templatesManagerId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_81f92b22d30540102e9654e892\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`templatesManagerId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`libraryId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7ba875eee72ec5fcbe2355124d\` ON \`templates_manager\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_19ea19263c6016f411fb008243\` ON \`templates_manager\``
    );
    await queryRunner.query(`DROP TABLE \`templates_manager\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b6617b64c6ea8ebb24947ddbd4\` ON \`template_default\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9dbeb9326140b3ce01c1037efe\` ON \`template_default\``
    );
    await queryRunner.query(`DROP TABLE \`template_default\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_43559aeadc1a5169d17e81b3d45\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}

enum TemplateDefaultType {
  PLATFORM_SPACE = 'platform-space',
  PLATFORM_SPACE_TUTORIALS = 'platform-space-tutorials',
  PLATFORM_SUBSPACE = 'platform-subspace',
  PLATFORM_SUBSPACE_KNOWLEDGE = 'platform-subspace-knowledge',
  SPACE_SUBSPACE = 'space-subspace',
}

enum TemplateType {
  CALLOUT = 'callout',
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  INNOVATION_FLOW = 'innovation-flow',
  COLLABORATION = 'collaboration',
}
