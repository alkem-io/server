import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class Templates1724832530055 implements MigrationInterface {
  name = 'Templates1724832530055';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`template\` (
                                  \`id\` char(36) NOT NULL,
                                  \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                  \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                  \`version\` int NOT NULL,
                                  \`nameID\` varchar(36) NOT NULL,
                                  \`authorizationId\` char(36) NULL,
                                  \`profileId\` char(36) NULL,
                                  \`templatesSetId\` char(36) NULL,
                                  \`type\` varchar(128) NOT NULL,
                                  \`calloutId\` char(36) NULL,
                                  \`collaborationId\` char(36) NULL,
                                  \`communityGuidelinesId\` char(36) NULL,
                                  \`innovationFlowId\` char(36) NULL,
                                  \`postDefaultDescription\` text NULL,
                                  \`whiteboardId\` char(36) NULL,
                                  UNIQUE INDEX \`IDX_e4b3a69d8f2c571b9462c4b3f0\` (\`nameID\`, \`templatesSetId\`),
                                  UNIQUE INDEX \`REL_4318f97beabd362a8a09e9d320\` (\`authorizationId\`),
                                  UNIQUE INDEX \`REL_f58c3b144b6e010969e199beef\` (\`profileId\`),
                                  UNIQUE INDEX \`REL_eedeae5e63f9a9c3a0161541e9\` (\`communityGuidelinesId\`),
                                  UNIQUE INDEX \`REL_c6e4d1a07781a809ad3b3ee826\` (\`calloutId\`),
                                  UNIQUE INDEX \`REL_7777d1a07781a809ad3b3ee826\` (\`collaborationId\`),
                                  UNIQUE INDEX \`REL_a68a76b795cd5a976c9a7c5b08\` (\`innovationFlowId\`),
                                  UNIQUE INDEX \`REL_f09090a77e07377eefb3f731d9\` (\`whiteboardId\`),
                                  PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `INSERT INTO \`template\` (id, createdDate, updatedDate, version, nameID, type, authorizationId, profileId, templatesSetId, communityGuidelinesId)
        SELECT id, createdDate, updatedDate, version, CONCAT('template-cg', SUBSTRING(id, 1, 8)) as \`nameID\`, 'community-guidelines' as \`type\`, authorizationId, profileId, templatesSetId, guidelinesId as communityGuidelinesId
          FROM \`community_guidelines_template\`;`
    );

    await queryRunner.query(
      `INSERT INTO \`template\` (id, createdDate, updatedDate, version, nameID, type, authorizationId, profileId, templatesSetId, postDefaultDescription)
        SELECT id, createdDate, updatedDate, version, CONCAT('template-po', SUBSTRING(id, 1, 8)) as \`nameID\`, 'post' as \`type\`, authorizationId, profileId, templatesSetId, defaultDescription as postDefaultDescription
          FROM \`post_template\`;`
    );

    const innovationFlowTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      nameID: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT
        innovation_flow_template.id,
        innovation_flow_template.createdDate,
        innovation_flow_template.updatedDate,
        innovation_flow_template.version,
        CONCAT('template-if', SUBSTRING(innovation_flow_template.id, 1, 8)) as \`nameID\`,
        innovation_flow_template.authorizationId,
        innovation_flow_template.profileId,
        innovation_flow_template.templatesSetId,
        profile.storageBucketId
      FROM \`innovation_flow_template\`
        LEFT OUTER JOIN \`profile\` ON \`profile\`.id = \`innovation_flow_template\`.profileId
      `
    );
    for (const innovationFlowTemplate of innovationFlowTemplates) {
      // Create a new InnovationFlow entity for each InnovationFlow
      const innovationFlowID =
        await this.createInnovationFlowFromInnovationFlowTemplate(
          queryRunner,
          innovationFlowTemplate.id,
          innovationFlowTemplate.storageBucketId
        );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, nameID, authorizationId, profileId, templatesSetId, type, innovationFlowId)
              VALUES (
              '${innovationFlowTemplate.id}',
              '${formatDate(innovationFlowTemplate.createdDate)}',
              '${formatDate(innovationFlowTemplate.updatedDate)}',
              ${innovationFlowTemplate.version},
              '${innovationFlowTemplate.nameID}',
              '${innovationFlowTemplate.authorizationId}',
              '${innovationFlowTemplate.profileId}',
              '${innovationFlowTemplate.templatesSetId}',
              'innovation-flow',
              '${innovationFlowID}')`
      );
    }

    await this.cleanUpWhiteboardTemplates(queryRunner);

    const whiteboardTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      nameID: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT
        whiteboard_template.id,
        whiteboard_template.createdDate,
        whiteboard_template.updatedDate,
        whiteboard_template.version,
        CONCAT('template-wb', SUBSTRING(whiteboard_template.id, 1, 8)) as \`nameID\`,
        whiteboard_template.authorizationId,
        whiteboard_template.profileId,
        whiteboard_template.templatesSetId,
        profile.storageBucketId
      FROM \`whiteboard_template\`
        LEFT OUTER JOIN \`profile\` ON \`profile\`.id = \`whiteboard_template\`.profileId
      `
    );
    for (const whiteboardTemplate of whiteboardTemplates) {
      // Create a new Whiteboard entity for each WhiteboardTemplate
      const whiteboardID = await this.createWhiteboardFromWhiteboardTemplate(
        queryRunner,
        whiteboardTemplate.id,
        whiteboardTemplate.storageBucketId
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, nameID, authorizationId, profileId, templatesSetId, type, whiteboardId)
              VALUES (
              '${whiteboardTemplate.id}',
              '${formatDate(whiteboardTemplate.createdDate)}',
              '${formatDate(whiteboardTemplate.updatedDate)}',
              ${whiteboardTemplate.version},
              '${whiteboardTemplate.nameID}',
              '${whiteboardTemplate.authorizationId}',
              '${whiteboardTemplate.profileId}',
              '${whiteboardTemplate.templatesSetId}',
              'whiteboard',
              '${whiteboardID}')`
      );
    }

    const calloutTemplates: {
      id: string;
      createdDate: Date;
      updatedDate: Date;
      version: number;
      nameID: string;
      authorizationId: string;
      profileId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT
        id,
        createdDate,
        updatedDate,
        version,
        CONCAT('template-ca', SUBSTRING(callout_template.id, 1, 8)) as \`nameID\`,
        authorizationId,
        profileId,
        templatesSetId,
        framingId,
        contributionDefaultsId,
        contributionPolicyId,
        type
      FROM \`callout_template\``
    );
    for (const calloutTemplate of calloutTemplates) {
      const calloutID = await this.createCalloutFromCalloutTemplate(
        queryRunner,
        calloutTemplate.id
      );
      await queryRunner.query(
        `INSERT INTO \`template\` (id, createdDate, updatedDate, version, nameID, authorizationId, profileId, templatesSetId, type, calloutId)
              VALUES (
              '${calloutTemplate.id}',
              '${formatDate(calloutTemplate.createdDate)}',
              '${formatDate(calloutTemplate.updatedDate)}',
              ${calloutTemplate.version},
              '${calloutTemplate.nameID}',
              '${calloutTemplate.authorizationId}',
              '${calloutTemplate.profileId}',
              '${calloutTemplate.templatesSetId}',
              'callout',
              '${calloutID}')`
      );
    }
    await queryRunner.query(
      `UPDATE \`profile\` SET type = 'template' WHERE type IN ('innovation-flow-template', 'post-template', 'callout-template', 'whiteboard-template', 'community-guidelines-template')`
    );

    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_4318f97beabd362a8a09e9d3203\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c7f54e6269c013d9c273f025edd\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f58c3b144b6e010969e199beeff\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_eedeae5e63f9a9c3a0161541e98\` FOREIGN KEY (\`communityGuidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c6e4d1a07781a809ad3b3ee8265\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_a68a76b795cd5a976c9a7c5b08a\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f09090a77e07377eefb3f731d9f\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    // drop the old constraint on space_defaults
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_592a23e68922853bae6ebecd85e\``
    );

    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_592a23e68922853bae6ebecd85e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Drop the old template tables
    await queryRunner.query(`DROP TABLE \`post_template\``);
    await queryRunner.query(`DROP TABLE \`whiteboard_template\``);
    await queryRunner.query(`DROP TABLE \`community_guidelines_template\``);
    await queryRunner.query(`DROP TABLE \`innovation_flow_template\``);
    await queryRunner.query(`DROP TABLE \`callout_template\``);
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`type\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createInnovationFlowFromInnovationFlowTemplate(
    queryRunner: QueryRunner,
    innovationFlowTemplateId: string,
    storageBucketId: string
  ): Promise<string> {
    const innovationFlowID = randomUUID();
    const authID = await createAuthorizationPolicy(
      queryRunner,
      'innovation-flow'
    );
    const profileId = await createProfile(
      queryRunner,
      'Innovation Flow',
      storageBucketId,
      'innovation-flow'
    );

    await queryRunner.query(
      `INSERT INTO innovation_flow (id, createdDate, updatedDate, version, authorizationId, profileId, states)
        SELECT '${innovationFlowID}' as \`id\`, createdDate, updatedDate, version, '${authID}' as authorizationId, '${profileId}' as profileId, states
        FROM innovation_flow_template WHERE id = '${innovationFlowTemplateId}'`
    );
    return innovationFlowID;
  }

  private async createWhiteboardFromWhiteboardTemplate(
    queryRunner: QueryRunner,
    whiteboardTemplateId: string,
    storageBucketId: string
  ): Promise<string> {
    const whiteboardID = randomUUID();
    const nameID = `template-${whiteboardID.slice(0, 8)}`;
    const authID = await createAuthorizationPolicy(queryRunner, 'whiteboard');
    const profileId = await createProfile(
      queryRunner,
      'Whiteboard',
      storageBucketId,
      'whiteboard'
    );

    await queryRunner.query(
      `INSERT INTO whiteboard (id, createdDate, updatedDate, version, authorizationId, profileId, content, nameID, contentUpdatePolicy)
        SELECT '${whiteboardID}' as \`id\`, createdDate, updatedDate, version, '${authID}' as authorizationId, '${profileId}' as profileId, content, '${nameID}' as nameID, 'admins' as contentUpdatePolicy
        FROM whiteboard_template WHERE id = '${whiteboardTemplateId}'`
    );
    return whiteboardID;
  }

  private async cleanUpWhiteboardTemplates(
    queryRunner: QueryRunner
  ): Promise<void> {
    // In acceptance I've seen an orphan template without templateSetId:

    console.warn(
      'THE FOLLOWING whiteboard_templates ARE GOING TO BE DELETED!!!',
      await queryRunner.query(
        `SELECT id FROM whiteboard_template WHERE templatesSetId IS NULL`
      )
    );

    await queryRunner.query(
      `DELETE FROM profile WHERE id IN (SELECT profileId FROM whiteboard_template WHERE templatesSetId IS NULL)`
    );
    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE id IN (SELECT authorizationId FROM whiteboard_template WHERE templatesSetId IS NULL)`
    );
    await queryRunner.query(
      `DELETE FROM whiteboard_template WHERE templatesSetId IS NULL`
    );
  }

  private async createCalloutFromCalloutTemplate(
    queryRunner: QueryRunner,
    calloutTemplateId: string
  ): Promise<string> {
    const calloutID = randomUUID();
    const nameID = `template-${calloutID.slice(0, 8)}`;
    const authID = await createAuthorizationPolicy(queryRunner, 'callout');

    await queryRunner.query(
      `INSERT INTO callout (id, createdDate, updatedDate, version, authorizationId, framingId, contributionDefaultsId, contributionPolicyId, type, visibility, sortOrder, nameID)
        SELECT '${calloutID}' as \`id\`, createdDate, updatedDate, version, '${authID}' as authorizationId,
          framingId,
          contributionDefaultsId,
          contributionPolicyId,
          \`type\`,
          'template',
          0,
          '${nameID}' as nameID
        FROM callout_template WHERE id = '${calloutTemplateId}'`
    );

    return calloutID;
  }
}

const createProfile = async (
  queryRunner: QueryRunner,
  entityName: string,
  templateStorageBucketId: string,
  profileType: string
) => {
  const profileId = randomUUID();
  const authID = await createAuthorizationPolicy(queryRunner, 'profile');
  const profileStorageBucketId = await createStorageBucket(
    queryRunner,
    templateStorageBucketId
  );
  await queryRunner.query(
    `INSERT INTO profile (id, version, authorizationId, locationId, displayName, tagline, storageBucketId, type) VALUES
    ('${profileId}', 1, '${authID}', null, '${entityName} Template', '', '${profileStorageBucketId}', '${profileType}')`
  );

  return profileId;
};

const createStorageBucket = async (
  queryRunner: QueryRunner,
  storageBucketId: string
) => {
  const newStorageBucketId = randomUUID();
  const authID = await createAuthorizationPolicy(queryRunner, 'storage-bucket');

  await queryRunner.query(
    `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
      SELECT '${newStorageBucketId}' as id, 1 as version, '${authID}' as authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId
        FROM storage_bucket WHERE id = '${storageBucketId}'`
  );

  return newStorageBucketId;
};

const createAuthorizationPolicy = async (
  queryRunner: QueryRunner,
  policyType: string
) => {
  const authID = randomUUID();
  await queryRunner.query(
    `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${authID}',
          1, '', '', 0, '', '${policyType}')`
  );
  return authID;
};

const formatDate = (date: Date) =>
  date.toISOString().replace('T', ' ').substring(0, 19);
