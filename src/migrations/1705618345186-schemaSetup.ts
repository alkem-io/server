import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  allowedTypes,
  maxAllowedFileSize,
} from './utils/storage/storage-bucket-utils';

export class schemaSetup1705618345186 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [tablesCount] = await queryRunner.query(
      `SELECT COUNT(*) AS total_tables
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'alkemio';`
    );

    // We assume an empty schema has no tables or has only the migrations table
    // If the schema is not empty we exit the migration
    if (tablesCount.total_tables > 1) {
      await this.addMissingConstraints(queryRunner);
      return;
    }

    // If there are migrations executed on the environment we exit the migration
    const migrations = await queryRunner.query(
      `SELECT name FROM migrations_typeorm;`
    );

    if (migrations.length > 0) {
      await this.addMissingConstraints(queryRunner);
      return;
    }

    await queryRunner.query(
      `CREATE TABLE \`activity\` (\`rowId\` int(11) NOT NULL AUTO_INCREMENT,\`id\` char(36) NOT NULL,\`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),\`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),\`version\` int(11) NOT NULL,\`triggeredBy\` char(36) DEFAULT NULL,\`collaborationID\` char(36) DEFAULT NULL,\`resourceID\` char(36) DEFAULT NULL,\`description\` varchar(255) NOT NULL,\`type\` varchar(128) NOT NULL,\`parentID\` char(36) DEFAULT NULL,\`messageID\` char(44) DEFAULT NULL,\`visibility\` tinyint(1) DEFAULT 1,PRIMARY KEY (\`id\`),UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` (\`rowId\`)) ENGINE=InnoDB AUTO_INCREMENT=3113 DEFAULT CHARSET=utf8mb4`
    );
    await queryRunner.query(`CREATE TABLE \`actor\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`value\` text DEFAULT NULL,
            \`impact\` varchar(255) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`actorGroupId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_a2afa3851ea733de932251b3a1\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`actor_group\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`ecosystemModelId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_bde98d59e8984e7d17034c3b93\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`agent\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`parentDisplayID\` text DEFAULT NULL,
            \`did\` varchar(255) DEFAULT NULL,
            \`password\` varchar(255) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`agreement\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`projectId\` char(36) DEFAULT NULL,
            \`tagsetId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_22348b89c2f802a3d75d52fbd5\` (\`tagsetId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`application\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`spaceId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`lifecycleId\` char(36) DEFAULT NULL,
            \`userId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_56f5614fff0028d40370499582\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` (\`lifecycleId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`application_questions\` (
            \`applicationId\` char(36) NOT NULL,
            \`nvpId\` char(36) NOT NULL,
            PRIMARY KEY (\`applicationId\`, \`nvpId\`),
            INDEX \`IDX_8495fae86f13836b0745642baa\` (\`applicationId\`),
            INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` (\`nvpId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`authorization_policy\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`credentialRules\` text NOT NULL,
            \`verifiedCredentialRules\` text NOT NULL,
            \`anonymousReadAccess\` tinyint(4) NOT NULL,
            \`privilegeRules\` text NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE \`calendar\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_94994efc5eb5936ed70f2c55903\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`calendar_event\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`createdBy\` char(36) DEFAULT NULL,
            \`commentsId\` char(36) DEFAULT NULL,
            \`startDate\` datetime(6) DEFAULT NULL,
            \`wholeDay\` tinyint(4) DEFAULT NULL,
            \`multipleDays\` tinyint(4) DEFAULT NULL,
            \`durationMinutes\` int(11) DEFAULT NULL,
            \`durationDays\` int(11) DEFAULT NULL,
            \`type\` varchar(255) NOT NULL,
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`calendarId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_222adf666c59b9eb5ce394714cf\` (\`commentsId\`),
            UNIQUE INDEX \`REL_a3693e1d3472c5ef8b00e51acfd\` (\`profileId\`),
            UNIQUE INDEX \`IDX_111838434c7198a323ea6f475fb\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`type\` text NOT NULL,
            \`visibility\` text NOT NULL DEFAULT ('draft'),
            \`authorizationId\` char(36) DEFAULT NULL,
            \`commentsId\` char(36) DEFAULT NULL,
            \`collaborationId\` char(36) DEFAULT NULL,
            \`sortOrder\` int(11) NOT NULL,
            \`publishedBy\` char(36) DEFAULT NULL,
            \`publishedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`createdBy\` char(36) DEFAULT NULL,
            \`framingId\` char(36) DEFAULT NULL,
            \`contributionPolicyId\` char(36) DEFAULT NULL,
            \`contributionDefaultsId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` (\`authorizationId\`),
            UNIQUE INDEX \`IDX_1e740008a7e1512966e3b08414\` (\`contributionPolicyId\`),
            UNIQUE INDEX \`IDX_36b0da55acff774d0845aeb55f\` (\`contributionDefaultsId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout_contribution\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`whiteboardId\` char(36) DEFAULT NULL,
            \`postId\` char(36) DEFAULT NULL,
            \`linkId\` char(36) DEFAULT NULL,
            \`calloutId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_dfa86c46f509a61c6510536cd9\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_5e34f9a356f6254b8da24f8947\` (\`whiteboardId\`),
            UNIQUE INDEX \`REL_97fefc97fb254c30577696e1c0\` (\`postId\`),
            UNIQUE INDEX \`REL_bdf2d0eced5c95968a85caaaae\` (\`linkId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout_contribution_defaults\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`postDescription\` text DEFAULT NULL,
            \`whiteboardContent\` longtext DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout_contribution_policy\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`allowedContributionTypes\` text NOT NULL,
            \`state\` varchar(255) NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout_framing\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`whiteboardId\` char(36) DEFAULT NULL,
            \`whiteboardRtId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_f53e2d266432e58e538a366705\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`callout_template\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`framingId\` char(36) DEFAULT NULL,
            \`contributionDefaultsId\` char(36) DEFAULT NULL,
            \`contributionPolicyId\` char(36) DEFAULT NULL,
            \`type\` varchar(255) NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_6c90723f8f1424e2dd08dddb39\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_75d5ced6c2e92cbbb5d8d0a913\` (\`profileId\`),
            UNIQUE INDEX \`REL_b94beb9cefe0a8814dceddd10f\` (\`framingId\`),
            UNIQUE INDEX \`REL_83bbc10ba2ddee4502bf327f1f\` (\`contributionDefaultsId\`),
            UNIQUE INDEX \`REL_bffd07760b73be1aad13b6d00c\` (\`contributionPolicyId\`),
            INDEX \`FK_7c434491e8e9ee8af12caff7db3\` (\`templatesSetId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`challenge\` (
            \`rowId\` int(11) NOT NULL AUTO_INCREMENT,
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) DEFAULT NULL,
            \`spaceId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`contextId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            \`parentChallengeId\` char(36) DEFAULT NULL,
            \`parentSpaceId\` char(36) DEFAULT NULL,
            \`preferenceSetId\` char(36) DEFAULT NULL,
            \`collaborationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`innovationFlowId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_e3b287bbffe59aba827d97d5fa\` (\`rowId\`),
            UNIQUE INDEX \`REL_178fa41e46fd331f3501a62f6b\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_1deebaabfc620e881858333b0d\` (\`contextId\`),
            UNIQUE INDEX \`REL_aa9668dd2340c2d794b414577b\` (\`communityId\`),
            UNIQUE INDEX \`REL_b025a2720e5ee0e5b38774f7a8\` (\`agentId\`),
            UNIQUE INDEX \`IDX_88592bee71718eec66a3bfc63f\` (\`preferenceSetId\`),
            UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` (\`collaborationId\`)
          ) ENGINE=InnoDB AUTO_INCREMENT=164 DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`collaboration\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`tagsetTemplateSetId\` char(36) DEFAULT NULL,
            \`timelineId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`communication\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`displayName\` varchar(255) NOT NULL,
            \`spaceID\` char(36) NOT NULL,
            \`updatesId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`discussionCategories\` text DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`community\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`spaceID\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`parentCommunityId\` char(36) DEFAULT NULL,
            \`communicationId\` char(36) DEFAULT NULL,
            \`type\` varchar(16) NOT NULL,
            \`parentID\` varchar(36) NOT NULL,
            \`policyId\` char(36) DEFAULT NULL,
            \`applicationFormId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` (\`authorizationId\`),
            UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` (\`communicationId\`),
            UNIQUE INDEX \`IDX_c9ff67519d26140f98265a542e\` (\`policyId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`community_policy\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`member\` text DEFAULT NULL,
            \`lead\` text DEFAULT NULL,
            \`admin\` text DEFAULT NULL,
            \`host\` text DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`context\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`vision\` text DEFAULT NULL,
            \`impact\` text DEFAULT NULL,
            \`who\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`ecosystemModelId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_a03169c3f86480ba3863924f4d\` (\`ecosystemModelId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`credential\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`resourceID\` char(36) NOT NULL,
            \`type\` varchar(255) NOT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`discussion\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`category\` text NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`communicationId\` char(36) DEFAULT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`nameID\` varchar(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`commentsId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`document\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`createdBy\` char(36) DEFAULT NULL,
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`storageBucketId\` char(36) DEFAULT NULL,
            \`displayName\` varchar(255) DEFAULT NULL,
            \`tagsetId\` char(36) DEFAULT NULL,
            \`mimeType\` varchar(36) DEFAULT NULL,
            \`size\` int(11) DEFAULT NULL,
            \`externalID\` varchar(128) DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`ecosystem_model\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`description\` varchar(255) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_658580aea4e1a892227e27db90\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`feature_flag\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` text NOT NULL,
            \`enabled\` tinyint(1) NOT NULL,
            \`licenseId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`form\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`questions\` text DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`innovation_flow\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`spaceID\` char(36) NOT NULL,
            \`type\` varchar(255) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`lifecycleId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_98a7abc9f297ffcacb53087dc8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`innovation_flow_template\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`definition\` longtext NOT NULL,
            \`type\` varchar(128) NOT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_76542ccdda9ba57d8e3a634cd8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`innovation_hub\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(255) NOT NULL,
            \`subdomain\` varchar(255) NOT NULL,
            \`type\` varchar(255) NOT NULL,
            \`spaceVisibilityFilter\` varchar(255) DEFAULT NULL,
            \`spaceListFilter\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` (\`subdomain\`),
            UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` (\`nameID\`),
            UNIQUE INDEX \`REL_b411e4f27d77a96eccdabbf4b4\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_36c8905c2c6c59467c60d94fd8\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`innovation_pack\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`libraryId\` char(36) DEFAULT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`invitation\` (
            \`id\` varchar(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`invitedUser\` char(36) DEFAULT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`authorizationId\` varchar(36) DEFAULT NULL,
            \`lifecycleId\` varchar(36) DEFAULT NULL,
            \`communityId\` varchar(36) DEFAULT NULL,
            \`welcomeMessage\` varchar(512) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`invitation_external\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`email\` varchar(255) NOT NULL,
            \`firstName\` varchar(255) DEFAULT NULL,
            \`lastName\` varchar(255) DEFAULT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`welcomeMessage\` varchar(512) DEFAULT NULL,
            \`profileCreated\` tinyint(4) NOT NULL DEFAULT 0,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_42a7abc9f297ffcacb53087da8\` (\`authorizationId\`),
            INDEX \`FK_2a985f774bd4de2a9aead6bd5b1\` (\`communityId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`library\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`),
            INDEX \`FK_6664d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`license\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`visibility\` varchar(36) DEFAULT 'active',
            \`authorizationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`lifecycle\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`machineState\` text DEFAULT NULL,
            \`machineDef\` text DEFAULT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`location\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`city\` varchar(255) NOT NULL,
            \`country\` varchar(255) NOT NULL,
            \`addressLine1\` varchar(128) NOT NULL DEFAULT '',
            \`addressLine2\` varchar(128) NOT NULL DEFAULT '',
            \`stateOrProvince\` varchar(128) NOT NULL DEFAULT '',
            \`postalCode\` varchar(128) NOT NULL DEFAULT '',
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`nvp\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`value\` varchar(512) DEFAULT NULL,
            \`sortOrder\` int(11) NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`opportunity\` (
            \`rowId\` int(11) NOT NULL AUTO_INCREMENT,
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) DEFAULT NULL,
            \`spaceID\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`contextId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            \`challengeId\` char(36) DEFAULT NULL,
            \`collaborationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`innovationFlowId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_313c12afe69143a9ee3779b4f6\` (\`rowId\`),
            UNIQUE INDEX \`REL_a344b754f33792cbbc58e41e89\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_9c169eb500e2d3823154c7b603\` (\`contextId\`),
            UNIQUE INDEX \`REL_1c7744df92f39ab567084fd8c0\` (\`communityId\`),
            UNIQUE INDEX \`REL_c814aa7dc8a68f27d96d5d1782\` (\`agentId\`),
            UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` (\`collaborationId\`),
            INDEX \`FK_0e2c355dbb2950851dbc17a4490\` (\`challengeId\`),
            INDEX \`FK_91231450cf75dc486700ca034c6\` (\`profileId\`),
            INDEX \`FK_4840f1e3ae5509245bdb5c401f3\` (\`innovationFlowId\`),
            INDEX \`FK_89894d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`)
          ) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`organization\` (
            \`rowId\` int(11) NOT NULL AUTO_INCREMENT,
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            \`legalEntityName\` varchar(255) NOT NULL,
            \`domain\` varchar(255) NOT NULL,
            \`website\` varchar(255) NOT NULL,
            \`contactEmail\` varchar(255) NOT NULL,
            \`verificationId\` char(36) DEFAULT NULL,
            \`preferenceSetId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_266bc44a18601f893566962df7\` (\`rowId\`),
            UNIQUE INDEX \`REL_badc07674ce4e44801e5a5f36c\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_037ba4b170844c039e74aa22ec\` (\`profileId\`),
            UNIQUE INDEX \`REL_7671a7e33f6665764f4534a596\` (\`agentId\`),
            UNIQUE INDEX \`IDX_95bbac07221e98072beafa6173\` (\`verificationId\`),
            UNIQUE INDEX \`REL_95bbac07221e98072beafa6173\` (\`verificationId\`),
            UNIQUE INDEX \`IDX_58fd47c4a6ac8df9fe2bcaed87\` (\`preferenceSetId\`),
            INDEX \`FK_3334d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`)
          ) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`organization_verification\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`organizationID\` char(36) DEFAULT NULL,
            \`status\` varchar(255) NOT NULL DEFAULT 'not-verified',
            \`authorizationId\` char(36) DEFAULT NULL,
            \`lifecycleId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_3795f9dd15ef3ef2dd1d27e309\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_22be0d440df7972d9b3a94aa6d\` (\`lifecycleId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`platform\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`libraryId\` char(36) DEFAULT NULL,
            \`communicationId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_44333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`),
            INDEX \`FK_55333901817dd09d5906537e088\` (\`communicationId\`),
            INDEX \`FK_5554d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`post\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`type\` varchar(255) NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`commentsId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_c52470717008d58ec6d76b12ff\` (\`authorizationId\`),
            UNIQUE INDEX \`IDX_c4fb636888fc391cf1d7406e89\` (\`commentsId\`),
            UNIQUE INDEX \`REL_c4fb636888fc391cf1d7406e89\` (\`commentsId\`),
            UNIQUE INDEX \`IDX_67663901817dd09d5906537e088\` (\`profileId\`),
            INDEX \`FK_67663901817dd09d5906537e088\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`post_template\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`type\` text NOT NULL,
            \`defaultDescription\` text NOT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_44447ccdda9ba57d8e3a634cd8\` (\`authorizationId\`),
            INDEX \`FK_66666450cf75dc486700ca034c6\` (\`templatesSetId\`),
            INDEX \`FK_59991450cf75dc486700ca034c6\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`preference\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`value\` varchar(16) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`preferenceDefinitionId\` char(36) DEFAULT NULL,
            \`preferenceSetId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` (\`authorizationId\`),
            INDEX \`FK_650fb4e564a8b4b4ac344270744\` (\`preferenceDefinitionId\`),
            INDEX \`FK_88881fbd1fef95a0540f7e7d1e2\` (\`preferenceSetId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`preference_definition\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`groupName\` varchar(128) NOT NULL,
            \`displayName\` varchar(128) NOT NULL,
            \`description\` varchar(255) NOT NULL,
            \`valueType\` varchar(16) NOT NULL,
            \`type\` varchar(128) NOT NULL,
            \`definitionSet\` varchar(128) NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`preference_set\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`profile\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`locationId\` char(36) DEFAULT NULL,
            \`displayName\` text NOT NULL,
            \`tagline\` varchar(255) DEFAULT NULL,
            \`storageBucketId\` char(36) DEFAULT NULL,
            \`type\` text NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_a96475631aba7dce41db03cc8b\` (\`authorizationId\`),
            UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` (\`locationId\`),
            UNIQUE INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`),
            UNIQUE INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`project\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`spaceID\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`lifecycleId\` char(36) DEFAULT NULL,
            \`opportunityId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_fac8673f44e6b295e30d1c1739\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` (\`lifecycleId\`),
            INDEX \`FK_35e34564793a27bb3c209a15245\` (\`opportunityId\`),
            INDEX \`FK_49991450cf75dc486700ca034c6\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`query-result-cache\` (
            \`id\` int(11) NOT NULL AUTO_INCREMENT,
            \`identifier\` varchar(255) DEFAULT NULL,
            \`time\` bigint(20) NOT NULL,
            \`duration\` int(11) NOT NULL,
            \`query\` text NOT NULL,
            \`result\` text NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`reference\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`uri\` text NOT NULL,
            \`description\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_73e8ae665a49366ca7e2866a45\` (\`authorizationId\`),
            INDEX \`FK_2f46c698fc4c19a8cc233c5f255\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`relation\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`type\` varchar(255) NOT NULL,
            \`actorName\` varchar(255) NOT NULL,
            \`actorType\` varchar(255) NOT NULL,
            \`actorRole\` varchar(255) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`collaborationId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_53fccd56207915b969b91834e0\` (\`authorizationId\`),
            INDEX \`FK_701a6f8e3e1da76354571767c3f\` (\`collaborationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`room\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`displayName\` varchar(255) NOT NULL,
            \`externalRoomID\` varchar(255) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`messagesCount\` int(11) NOT NULL,
            \`type\` varchar(255) NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_7777dccdda9ba57d8e3a634cd8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`space\` (
            \`rowId\` int(11) NOT NULL AUTO_INCREMENT,
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`contextId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            \`preferenceSetId\` char(36) DEFAULT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`collaborationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            \`licenseId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` (\`rowId\`),
            UNIQUE INDEX \`REL_17a161eef37c9f07186532ab75\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_6db8627abbf00b1b986e359054\` (\`contextId\`),
            UNIQUE INDEX \`REL_f5ad15bcb06a95c2a109fbcce2\` (\`communityId\`),
            UNIQUE INDEX \`REL_b0c3f360534db92017e36a00bb\` (\`agentId\`),
            UNIQUE INDEX \`IDX_99990355b4e9bd6b02c66507aa\` (\`preferenceSetId\`),
            UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` (\`collaborationId\`),
            INDEX \`FK_33336901817dd09d5906537e088\` (\`templatesSetId\`),
            INDEX \`FK_71231450cf75dc486700ca034c6\` (\`profileId\`),
            INDEX \`FK_1114d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`),
            INDEX \`FK_3ef80ef55ba1a1d45e625ea8389\` (\`licenseId\`)
          ) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`storage_aggregator\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`parentStorageAggregatorId\` char(36) DEFAULT NULL,
            \`directStorageId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_0647707288c243e60091c8d862\` (\`directStorageId\`),
            INDEX \`FK_b80c28f5335ab5442f63c644d94\` (\`parentStorageAggregatorId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`storage_bucket\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`allowedMimeTypes\` text DEFAULT NULL,
            \`maxFileSize\` int(11) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_77994efc5eb5936ed70f2c55903\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`tagset\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL DEFAULT 'default',
            \`tags\` text NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`tagsetTemplateId\` char(36) DEFAULT NULL,
            \`type\` varchar(255) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` (\`authorizationId\`),
            INDEX \`FK_81fc213b2d9ad0cddeab1a9ce64\` (\`profileId\`),
            INDEX \`FK_7ab35130cde781b69259eec7d85\` (\`tagsetTemplateId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`tagset_template\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) DEFAULT NULL,
            \`type\` varchar(255) DEFAULT NULL,
            \`allowedValues\` text DEFAULT NULL,
            \`defaultSelectedValue\` varchar(255) DEFAULT NULL,
            \`tagsetTemplateSetId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            INDEX \`FK_9ad35130cde781b69259eec7d85\` (\`tagsetTemplateSetId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`tagset_template_set\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`templates_set\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`policy\` text DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_66666ccdda9ba57d8e3a634cd8\` (\`authorizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`timeline\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`calendarId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_e6203bc09ec8b93debeb3a44cb9\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_10ed346b16ca044cd84fb1c4034\` (\`calendarId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`user\` (
            \`rowId\` int(11) NOT NULL AUTO_INCREMENT,
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`accountUpn\` varchar(255) NOT NULL,
            \`firstName\` varchar(255) NOT NULL,
            \`lastName\` varchar(255) NOT NULL,
            \`email\` varchar(255) NOT NULL,
            \`phone\` varchar(255) NOT NULL,
            \`gender\` varchar(255) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`agentId\` char(36) DEFAULT NULL,
            \`communicationID\` varchar(255) NOT NULL,
            \`serviceProfile\` tinyint(4) NOT NULL,
            \`preferenceSetId\` char(36) DEFAULT NULL,
            \`storageAggregatorId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_266bc44a18601f893566962df6\` (\`rowId\`),
            UNIQUE INDEX \`REL_09f909622aa177a097256b7cc2\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_9466682df91534dd95e4dbaa61\` (\`profileId\`),
            UNIQUE INDEX \`REL_b61c694cacfab25533bd23d9ad\` (\`agentId\`),
            UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` (\`preferenceSetId\`),
            INDEX \`FK_4444d59c0b805c9c1ecb0070e16\` (\`storageAggregatorId\`)
          ) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`user_group\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`spaceID\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`organizationId\` char(36) DEFAULT NULL,
            \`communityId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_e8e32f1e59c349b406a4752e54\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_9912e4cfc1e09848a392a65151\` (\`profileId\`),
            INDEX \`FK_9fcc131f256e969d773327f07cb\` (\`communityId\`),
            INDEX \`FK_2b8381df8c3a1680f50e4bc2351\` (\`organizationId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`visual\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`uri\` text NOT NULL,
            \`minWidth\` int(11) NOT NULL,
            \`maxWidth\` int(11) NOT NULL,
            \`minHeight\` int(11) NOT NULL,
            \`maxHeight\` int(11) NOT NULL,
            \`aspectRatio\` float DEFAULT NULL,
            \`allowedTypes\` text NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`alternativeText\` varchar(120) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_439d0b187986492b58178a82c3\` (\`authorizationId\`),
            INDEX \`FK_77771450cf75dc486700ca034c6\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`whiteboard\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`content\` longtext NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`checkoutId\` char(36) DEFAULT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_1dc9521a013c92854e92e09933\` (\`authorizationId\`),
            UNIQUE INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` (\`checkoutId\`),
            UNIQUE INDEX \`REL_1dc9521a013c92854e92e09933\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` (\`checkoutId\`),
            INDEX \`FK_29991450cf75dc486700ca034c6\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`whiteboard_checkout\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`whiteboardId\` char(36) NOT NULL,
            \`lockedBy\` char(36) NOT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`lifecycleId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_353b042af56f01ce222f08abf4\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` (\`lifecycleId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`whiteboard_rt\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`nameID\` varchar(255) NOT NULL,
            \`content\` longtext NOT NULL,
            \`createdBy\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            \`contentUpdatePolicy\` varchar(255) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_60e34af57347a7d391bc598568\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_9dd2273a4105bd6ed536fe4913\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`whiteboard_template\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            \`version\` int(11) NOT NULL,
            \`templatesSetId\` char(36) DEFAULT NULL,
            \`authorizationId\` char(36) DEFAULT NULL,
            \`content\` longtext NOT NULL,
            \`profileId\` char(36) DEFAULT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`REL_88888ccdda9ba57d8e3a634cd8\` (\`authorizationId\`),
            INDEX \`FK_65556450cf75dc486700ca034c6\` (\`templatesSetId\`),
            INDEX \`FK_69991450cf75dc486700ca034c6\` (\`profileId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_33355901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_77755450cf75dc486700ca034c6\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_6a30f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_22255901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_157de0ce487e25bb69437e80b13\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_111838434c7198a323ea6f475fb\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_dfa86c46f509a61c6510536cd9a\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_5e34f9a356f6254b8da24f8947b\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_97fefc97fb254c30577696e1c0a\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`reference\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_7370de8eb79ed00b0d403f2299a\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_c9d7c2c4eb8a1d012ddc6605da9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_f53e2d266432e58e538a366705d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD INDEX \`IDX_8bc0e1f40be5816d3a593cbf7f\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD INDEX \`IDX_62712f63939a6d56fd5c334ee3\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_8bc0e1f40be5816d3a593cbf7fa\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_62712f63939a6d56fd5c334ee3f\` FOREIGN KEY (\`whiteboardRtId\`) REFERENCES \`whiteboard_rt\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      ` ALTER TABLE \`challenge\` ADD CONSTRAINT FK_c890de5a08d363719a41703a638 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_aa9668dd2340c2d794b414577b6` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_81231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_4c435130cde781b69259eec7d85` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentSpaceId`) REFERENCES `space`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_2224d59c0b805c9c1ecb0070e16` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_1deebaabfc620e881858333b0d0` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_178fa41e46fd331f3501a62f6bf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineId`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_1a135130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_25543901817dd09d5906537e088\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_c6a084fe80d01c41d9f142d51aa\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_345655450cf75dc486700ca034c6\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_3337f26ca267009fcf514e0e726\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_222838434c7198a323ea6f475fb\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_11155450cf75dc486700ca034c6\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` ADD CONSTRAINT \`FK_7e3e0a8b6d3e9b4a3a0d6e3a3e3\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_da1a68698d32f610a5fc1880c7f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_da7368698d32f610a5fc1880c7f` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_4b4a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_79991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD CONSTRAINT \`FK_76546450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_55555901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_39991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_22222901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_42a7abc9f297ffcacb53087da88\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_2a985f774bd4de2a9aead6bd5b1\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE  SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_6664d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_33333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license\` ADD CONSTRAINT \`FK_bfd01743815f0dd68ac1c5c45c0\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_4840f1e3ae5509245bdb5c401f3` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_89894d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_91231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_a344b754f33792cbbc58e41e898` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_3334d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_95bbac07221e98072beafa61732` FOREIGN KEY (`verificationId`) REFERENCES `organization_verification`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT FK_c07b5b4c96fa89cb80215827668 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_3795f9dd15ef3ef2dd1d27e309c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_22be0d440df7972d9b3a94aa6d5` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_5554d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_55333901817dd09d5906537e088\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_44333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT FK_00a8c330495ef844bfc6975ec89 FOREIGN KEY (authorizationId) REFERENCES authorization_policy(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_66666450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_59991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post_template\` ADD CONSTRAINT \`FK_44446901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_88881fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_650fb4e564a8b4b4ac344270744\` FOREIGN KEY (\`preferenceDefinitionId\`) REFERENCES \`preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `profile` ADD CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_4a1c74fd2a61b32d9d9500e0650\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_49991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`relation\` ADD CONSTRAINT \`FK_701a6f8e3e1da76354571767c3f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT FK_6bf7adf4308991457fdb04624e2 FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_1114d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_f3b4d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_b80c28f5335ab5442f63c644d94\` FOREIGN KEY (\`parentStorageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` ADD CONSTRAINT \`FK_0647707288c243e60091c8d8620\` FOREIGN KEY (\`directStorageId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_77755901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_7ab35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateId`) REFERENCES `tagset_template`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` ADD CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset_template` ADD CONSTRAINT `FK_9ad35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_66666901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_66355901817dd09d5906537e088\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_22443901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT FK_5ea996d22fbd9d522a59a39b74e FOREIGN KEY (preferenceSetId) REFERENCES preference_set(id) ON DELETE SET NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_4444d59c0b805c9c1ecb0070e16\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_77771450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_29991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`whiteboard_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` ADD CONSTRAINT `FK_60e34af57347a7d391bc5985681` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` ADD CONSTRAINT `FK_9dd2273a4105bd6ed536fe49138` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_45556901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_69991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` ADD CONSTRAINT \`FK_65556450cf75dc486700ca034c6\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // create library instance with authorization
    const libraryAuthID = randomUUID();
    const libraryID = randomUUID();
    const libraryAuthPolicy = `[{"type":"global-admin","resourceID":"","grantedPrivileges":["create","read","update","delete"],"inheritable":true},{"type":"global-admin-hubs","resourceID":"","grantedPrivileges":["create","read","update","delete"],"inheritable":true}]`;
    const libraryStorageAggregatorID = await this.createStorageAggregator(
      queryRunner
    );

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${libraryAuthID}', NOW(), NOW(), 1, '${libraryAuthPolicy}', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO library (id, createdDate, updatedDate, version, authorizationId, storageAggregatorId) VALUES ('${libraryID}', NOW(), NOW(), 1, '${libraryAuthID}', '${libraryStorageAggregatorID}')`
    );

    // create platform instance with authorization
    const platformAuthID = randomUUID();
    const platformID = randomUUID();
    const platformStorageAggregatorID = await this.createStorageAggregator(
      queryRunner
    );

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${platformAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO platform (id, createdDate, updatedDate, version, authorizationId, libraryId, storageAggregatorId) VALUES ('${platformID}', NOW(), NOW(), 1, '${platformAuthID}', '${libraryID}', '${platformStorageAggregatorID}')`
    );

    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_11d0ed50a26da5513f7e4347847\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    var preferenceDefinitionIds = [...Array(42)].map(id => randomUUID());

    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, groupName, displayName, description, valueType, type, definitionSet)
      VALUES
        ('${preferenceDefinitionIds[0]}',1,'NotificationGlobalAdmin','[Admin] User profile deleted','Receive a notification when a user profile is removed','boolean','NotificationUserRemoved','user'),
        ('${preferenceDefinitionIds[1]}',1,'Notification','Community Application','Receive notification when I apply to join a community','boolean','NotificationApplicationSubmitted','user'),
        ('${preferenceDefinitionIds[2]}',1,'Notification','Community Updates','Receive notification when a new update is shared with a community I am a member of','boolean','NotificationCommunityUpdates','user'),
        ('${preferenceDefinitionIds[3]}',1,'Notification','Community Discussion created','Receive notification when a new discussion is created on a community I am a member of','boolean','NotificationCommunityDiscussionCreated','user'),
        ('${preferenceDefinitionIds[4]}',1,'NotificationForum','Receive a notification when a new comment is added to a Discussion I created in the Forum','Receive a notification when a new comment is added to a Discussion I created in the Forum','boolean','NotificationForumDiscussionComment','user'),
        ('${preferenceDefinitionIds[5]}',1,'NotificationCommunityAdmin','[Admin] Community Applications','Receive notification when a new application is received for a community for which I am an administrator','boolean','NotificationApplicationReceived','user'),
        ('${preferenceDefinitionIds[6]}',1,'NotificationGlobalAdmin','[Admin] New user sign up','Receive notification when a new user signs up','boolean','NotificationUserSignUp','user'),
        ('${preferenceDefinitionIds[7]}',1,'NotificationCommunityAdmin','[Admin] Community Discussion Created','Receive notification when a new discussion is created for a community for which I am an administrator','boolean','NotificationCommunityDiscussionCreatedAdmin','user'),
        ('${preferenceDefinitionIds[8]}',1,'NotificationCommunityAdmin','[Admin] Community Updates','Receive notification when a new update is shared with a community for which I am an administrator','boolean','NotificationCommunityUpdateSentAdmin','user'),
        ('${preferenceDefinitionIds[9]}',1,'MembershipSpace','Applications allowed','Allow applications to this Space','boolean','MembershipApplicationsFromAnyone','space'),
        ('${preferenceDefinitionIds[10]}',1,'MembershipSpace','Anyone can join','Allow any registered user to join this Space','boolean','MembershipJoinSpaceFromAnyone','space'),
        ('${preferenceDefinitionIds[11]}',1,'MembershipSpace','Host Organization Join','Allow members of the host organization to join','boolean','MembershipJoinSpaceFromHostOrganizationMembers','space'),
        ('${preferenceDefinitionIds[12]}',1,'Authorization','Anonymous read access','Allow non-members to read the contents of this Space','boolean','AuthorizationAnonymousReadAccess','space'),
        ('${preferenceDefinitionIds[13]}',1,'AuthorizationOrganization','Domain based membership','Automatically add new users with emails matching the domain of the Organization','boolean','AuthorizationOrganizationMatchDomain','organization'),
        ('${preferenceDefinitionIds[14]}',1,'Notification','Invitations to a community','Receive a notification when someone invites you to join a community','boolean','NotificationCommunityInvitationUser','user'),
        ('${preferenceDefinitionIds[15]}',1,'NotificationCommunityAdmin','[Admin] Community review submitted','Receive notification when a new community review is submitted by a member','boolean','NotificationCommunityReviewSubmittedAdmin','user'),
        ('${preferenceDefinitionIds[16]}',1,'NotificationCommunication','Mentions or tags of you in posts or comments','Receive a notification when a user tags you in a post or a comment','boolean','NotificationCommunicationMention','user'),
        ('${preferenceDefinitionIds[17]}',1,'Notification','Opportunity collaboration interest confirmation','User receives confirmation email when submits interest for collaboration on an opportunity.','boolean','NotificationCommunityCollaborationInterestUser','user'),
        ('${preferenceDefinitionIds[18]}',1,'Authorization','Allow non-members to read the contents of this Challenge.','Allow non-members to read the contents of this Challenge.','boolean','AllowNonMembersReadAccess','challenge'),
        ('${preferenceDefinitionIds[19]}',1,'Notification','New Callout published','Receive a notification when a Callout is published in a community I am a member of','boolean','NotificationCalloutPublished','user'),
        ('${preferenceDefinitionIds[20]}',1,'NotificationCommunityAdmin','[Admin] New Post created','Receive notification when an Post is created in a community I am administrator of','boolean','NotificationPostCreatedAdmin','user'),
        ('${preferenceDefinitionIds[21]}',1,'NotificationForum','Receive a notification when a new Discussion is created in the Forum','Receive a notification when a new Discussion is created in the Forum','boolean','NotificationForumDiscussionCreated','user'),
        ('${preferenceDefinitionIds[22]}',1,'NotificationOrganizationAdmin','Allow direct messages to organizations you manage','Receive notification when the organization you are admin of is messaged','boolean','NotificationOrganizationMessage','user'),
        ('${preferenceDefinitionIds[23]}',1,'Privileges','Allow contributors to create Opportunities.','Allow contributors to the Challenge to create Opportunities.','boolean','AllowContributorsToCreateOpportunities','challenge'),
        ('${preferenceDefinitionIds[24]}',1,'NotificationCommunityAdmin','[Admin] New opportunity collaboration interest','Receive notification when a user submits collaboration interest for an opportunity community I am administrator of','boolean','NotificationCommunityCollaborationInterestAdmin','user'),
        ('${preferenceDefinitionIds[25]}',1,'Notification','New Post created','Receive notification when an Post is created in community i am a member of','boolean','NotificationPostCreated','user'),
        ('${preferenceDefinitionIds[26]}',1,'NotificationCommunityAdmin','[Admin] Community new member','Receiver notification when a new user joins a community for which I am an administrator','boolean','NotificationCommunityNewMemberAdmin','user'),
        ('${preferenceDefinitionIds[27]}',1,'Notification','New Whiteboard created','Receive a notification when a Whiteboard is created in a community I am a member of','boolean','NotificationWhiteboardCreated','user'),
        ('${preferenceDefinitionIds[28]}',1,'Privileges','Allow Space members to contribute.','Allow Space members to contribute.','boolean','AllowSpaceMembersToContribute','challenge'),
        ('${preferenceDefinitionIds[29]}',1,'Privileges','Allow members to create Callouts.','Allow members to create Callouts.','boolean','AllowMembersToCreateCallouts','space'),
        ('${preferenceDefinitionIds[30]}',1,'MembershipChallenge','Allow Space members to apply','Allow members of the parent Space to apply to this Challenge','boolean','MembershipApplyChallengeFromSpaceMembers','challenge'),
        ('${preferenceDefinitionIds[31]}',1,'MembershipChallenge','Allow Space members to provide feedback on Context','Allow members of the parent Space to give feedback on the Challenge Context','boolean','MembershipFeedbackOnChallengeContext','challenge'),
        ('${preferenceDefinitionIds[32]}',1,'Privileges','Allow Space members to create Challenges','Allow members of the Space to create Challenges.','boolean','AllowMembersToCreateChallenges','space'),
        ('${preferenceDefinitionIds[33]}',1,'NotificationCommunication','Allow direct messages from other users','Receive a notification when a user wants to directly send you a message or shares with you','boolean','NotificationCommunicationMessage','user'),
        ('${preferenceDefinitionIds[34]}',1,'Notification','Community review submitted','Receive notification when you submit a new community review','boolean','NotificationCommunityReviewSubmitted','user'),
        ('${preferenceDefinitionIds[35]}',1,'Notification','Comment replies','Receive a notification when someone replies to your comment','boolean','NotificationCommentReply','user'),
        ('${preferenceDefinitionIds[36]}',1,'Notification','New comment on Discssion','Receive a notification when a new comment is added to a Discussion in a community I am a member of','boolean','NotificationDiscussionCommentCreated','user'),
        ('${preferenceDefinitionIds[37]}',1,'NotificationOrganizationAdmin','Mentions or tags of an organization you manage','Receive a notification when the organization you are admin of is mentioned','boolean','NotificationOrganizationMention','user'),
        ('${preferenceDefinitionIds[38]}',1,'MembershipChallenge','Allow Space members to join','Allow members of the parent Space to join this Challenge','boolean','MembershipJoinChallengeFromSpaceMembers','challenge'),
        ('${preferenceDefinitionIds[39]}',1,'Notification','Community new member','Receiver notification when I join a community','boolean','NotificationCommunityNewMember','user'),
        ('${preferenceDefinitionIds[40]}',1,'Privileges','Allow contributors to create Callouts.','Allow contributors to create Callouts.','boolean','AllowContributorsToCreateCallouts','challenge'),
        ('${preferenceDefinitionIds[41]}',1,'Notification','New comment on my Post','Receive notification when a comment is created on my Post','boolean','NotificationPostCommentCreated','user')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async addMissingConstraints(queryRunner: QueryRunner) {
    const storageBuckets = await queryRunner.query(
      `SELECT id FROM storage_bucket where storageAggregatorId NOT IN (select id from storage_aggregator);`
    );
    for (const storageBucket of storageBuckets) {
      await queryRunner.query(
        `UPDATE storage_bucket
        SET storageAggregatorId = NULL
        WHERE id = '${storageBucket.id}'`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_11d0ed50a26da5513f7e4347847\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
  private async createStorageAggregator(
    queryRunner: QueryRunner
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();
    const directStorageID = randomUUID();
    const directStorageAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${storageAggregatorAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${directStorageAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
            VALUES ('${directStorageID}',
                    '1',
                    '${directStorageAuthID}',
                    '${allowedTypes}',
                    ${maxAllowedFileSize},
                    '${storageAggregatorID}')`
    );

    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, version, authorizationId,  directStorageId)
              VALUES ('${storageAggregatorID}',
                      '1',
                      '${storageAggregatorAuthID}',
                      '${directStorageID}')`
    );

    return storageAggregatorID;
  }
}
