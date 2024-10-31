import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaSetup1730367336792 implements MigrationInterface {
  name = 'SchemaSetup1730367336792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If there are migrations executed on the environment we exit the migration
    const migrations = await queryRunner.query(
      `SELECT name FROM migrations_typeorm;`
    );

    if (migrations.length > 0) {
      return;
    }
    await queryRunner.query(
      `CREATE TABLE \`authorization_policy\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`credentialRules\` text NOT NULL, \`privilegeRules\` text NOT NULL, \`verifiedCredentialRules\` text NOT NULL, \`anonymousReadAccess\` tinyint NOT NULL, \`type\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`tagset_template_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`tagset_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(128) NOT NULL, \`type\` varchar(128) NOT NULL, \`allowedValues\` text NOT NULL, \`defaultSelectedValue\` varchar(255) NULL, \`tagsetTemplateSetId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`tagset\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL DEFAULT 'default', \`type\` varchar(128) NOT NULL, \`tags\` text NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`tagsetTemplateId\` char(36) NULL, UNIQUE INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`visual\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`uri\` varchar(2048) NOT NULL, \`minWidth\` int NOT NULL, \`maxWidth\` int NOT NULL, \`minHeight\` int NOT NULL, \`maxHeight\` int NOT NULL, \`aspectRatio\` decimal(3,1) NOT NULL, \`allowedTypes\` text NOT NULL, \`alternativeText\` varchar(120) NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`location\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`city\` varchar(128) NULL, \`country\` varchar(128) NULL, \`addressLine1\` varchar(512) NULL, \`addressLine2\` varchar(512) NULL, \`stateOrProvince\` varchar(128) NULL, \`postalCode\` varchar(128) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`document\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`createdBy\` char(36) NULL, \`displayName\` varchar(512) NOT NULL, \`mimeType\` varchar(128) NOT NULL, \`size\` int NOT NULL, \`externalID\` varchar(128) NOT NULL, \`temporaryLocation\` tinyint NOT NULL DEFAULT 0, \`authorizationId\` char(36) NULL, \`storageBucketId\` char(36) NULL, \`tagsetId\` char(36) NULL, UNIQUE INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` (\`authorizationId\`), UNIQUE INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` (\`tagsetId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`storage_aggregator\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(128) NULL, \`authorizationId\` char(36) NULL, \`parentStorageAggregatorId\` char(36) NULL, \`directStorageId\` char(36) NULL, UNIQUE INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` (\`authorizationId\`), UNIQUE INDEX \`REL_0647707288c243e60091c8d862\` (\`directStorageId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`storage_bucket\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`allowedMimeTypes\` text NOT NULL, \`maxFileSize\` int NOT NULL, \`authorizationId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, UNIQUE INDEX \`REL_f2f48b57269987b13b415a0058\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`profile\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` text NOT NULL, \`tagline\` text NULL, \`description\` text NULL, \`type\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, \`locationId\` char(36) NULL, \`storageBucketId\` char(36) NULL, UNIQUE INDEX \`REL_a96475631aba7dce41db03cc8b\` (\`authorizationId\`), UNIQUE INDEX \`REL_432056041df0e4337b17ff7b09\` (\`locationId\`), UNIQUE INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`reference\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`uri\` text NOT NULL, \`description\` text NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_73e8ae665a49366ca7e2866a45\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`vc_interaction\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`threadID\` varchar(44) NOT NULL, \`virtualContributorID\` char(36) NOT NULL, \`externalMetadata\` text NOT NULL, \`roomId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`room\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`externalRoomID\` varchar(255) NOT NULL, \`messagesCount\` int NOT NULL, \`type\` varchar(128) NOT NULL, \`displayName\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`whiteboard\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`content\` longtext NOT NULL, \`createdBy\` char(36) NULL, \`contentUpdatePolicy\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_d3b86160bb7d704212382b0ca4\` (\`authorizationId\`), UNIQUE INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_framing\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`whiteboardId\` char(36) NULL, UNIQUE INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` (\`authorizationId\`), UNIQUE INDEX \`REL_f53e2d266432e58e538a366705\` (\`profileId\`), UNIQUE INDEX \`REL_8bc0e1f40be5816d3a593cbf7f\` (\`whiteboardId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution_policy\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`allowedContributionTypes\` text NOT NULL, \`state\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution_defaults\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`postDescription\` text NULL, \`whiteboardContent\` longtext NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`post\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`createdBy\` char(36) NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`commentsId\` char(36) NULL, UNIQUE INDEX \`REL_390343b22abec869bf80041933\` (\`authorizationId\`), UNIQUE INDEX \`REL_970844fcd10c2b6df7c1b49eac\` (\`profileId\`), UNIQUE INDEX \`REL_042b9825d770d6b3009ae206c2\` (\`commentsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`link\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`uri\` text NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_07f249ac87502495710a62c5c0\` (\`authorizationId\`), UNIQUE INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`createdBy\` char(36) NULL, \`sortOrder\` int NOT NULL, \`authorizationId\` char(36) NULL, \`whiteboardId\` char(36) NULL, \`postId\` char(36) NULL, \`linkId\` char(36) NULL, \`calloutId\` char(36) NULL, UNIQUE INDEX \`REL_dfa86c46f509a61c6510536cd9\` (\`authorizationId\`), UNIQUE INDEX \`REL_5e34f9a356f6254b8da24f8947\` (\`whiteboardId\`), UNIQUE INDEX \`REL_97fefc97fb254c30577696e1c0\` (\`postId\`), UNIQUE INDEX \`REL_bdf2d0eced5c95968a85caaaae\` (\`linkId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`type\` text NOT NULL, \`isTemplate\` tinyint NOT NULL DEFAULT 0, \`createdBy\` char(36) NULL, \`visibility\` varchar(128) NOT NULL, \`sortOrder\` int NOT NULL, \`publishedBy\` char(36) NULL, \`publishedDate\` datetime NULL, \`authorizationId\` char(36) NULL, \`framingId\` char(36) NULL, \`contributionPolicyId\` char(36) NULL, \`contributionDefaultsId\` char(36) NULL, \`commentsId\` char(36) NULL, \`collaborationId\` char(36) NULL, UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` (\`authorizationId\`), UNIQUE INDEX \`REL_cf776244b01436d8ca5cc76284\` (\`framingId\`), UNIQUE INDEX \`REL_1e740008a7e1512966e3b08414\` (\`contributionPolicyId\`), UNIQUE INDEX \`REL_36b0da55acff774d0845aeb55f\` (\`contributionDefaultsId\`), UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` (\`commentsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`calendar_event\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`type\` varchar(128) NOT NULL, \`createdBy\` char(36) NOT NULL, \`startDate\` datetime NOT NULL, \`wholeDay\` tinyint NOT NULL, \`multipleDays\` tinyint NOT NULL, \`durationMinutes\` int NOT NULL, \`durationDays\` int NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`commentsId\` char(36) NULL, \`calendarId\` char(36) NULL, UNIQUE INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` (\`authorizationId\`), UNIQUE INDEX \`REL_9349e137959f3ca5818c2e62b3\` (\`profileId\`), UNIQUE INDEX \`REL_b5069b11030e9608ee4468f850\` (\`commentsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`calendar\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_6e74d59afda096b68d12a69969\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`timeline\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`calendarId\` char(36) NULL, UNIQUE INDEX \`REL_5fe58ece01b48496aebc04733d\` (\`authorizationId\`), UNIQUE INDEX \`REL_56aae15a664b2889a1a11c2cf8\` (\`calendarId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`innovation_flow\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`states\` text NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` (\`authorizationId\`), UNIQUE INDEX \`REL_96a8cbe1706f459fd7d883be9b\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`collaboration\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`groupsStr\` text NOT NULL, \`authorizationId\` char(36) NULL, \`tagsetTemplateSetId\` char(36) NULL, \`timelineId\` char(36) NULL, \`innovationFlowId\` char(36) NULL, UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` (\`authorizationId\`), UNIQUE INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` (\`tagsetTemplateSetId\`), UNIQUE INDEX \`REL_f67a2d25c945269d602c182fbc\` (\`timelineId\`), UNIQUE INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` (\`innovationFlowId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`lifecycle\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`machineState\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`organization_verification\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`organizationID\` varchar(36) NOT NULL, \`status\` varchar(128) NOT NULL DEFAULT 'not-verified', \`authorizationId\` char(36) NULL, \`lifecycleId\` char(36) NULL, UNIQUE INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` (\`authorizationId\`), UNIQUE INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` (\`lifecycleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`preference_definition\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`definitionSet\` varchar(128) NOT NULL, \`groupName\` varchar(128) NOT NULL, \`displayName\` varchar(128) NOT NULL, \`description\` varchar(255) NOT NULL, \`valueType\` varchar(16) NOT NULL, \`type\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`preference\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`value\` varchar(16) NOT NULL, \`authorizationId\` char(36) NULL, \`preferenceDefinitionId\` char(36) NULL, \`preferenceSetId\` char(36) NULL, UNIQUE INDEX \`REL_b4cf0f96bf08cf396f68355522\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`preference_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_8e76dcf171c45875c44febb1d8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`credential\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`resourceID\` varchar(36) NOT NULL, \`type\` varchar(128) NOT NULL, \`issuer\` char(36) NULL, \`expires\` datetime NULL, \`agentId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`agent\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`did\` varchar(255) NULL, \`password\` varchar(255) NULL, \`type\` varchar(128) NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`organization\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`communicationID\` varchar(255) NOT NULL, \`accountID\` char(36) NOT NULL, \`rowId\` int NOT NULL AUTO_INCREMENT, \`legalEntityName\` varchar(255) NOT NULL, \`domain\` varchar(255) NOT NULL, \`website\` varchar(255) NOT NULL, \`contactEmail\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`agentId\` char(36) NULL, \`verificationId\` char(36) NULL, \`preferenceSetId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, UNIQUE INDEX \`IDX_9fdd8f0bfe04a676822c7265e1\` (\`rowId\`), UNIQUE INDEX \`REL_e0e150e4f11d906b931b46a2d8\` (\`authorizationId\`), UNIQUE INDEX \`REL_d2cb77c14644156ec8e865608e\` (\`profileId\`), UNIQUE INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` (\`agentId\`), UNIQUE INDEX \`REL_5a72d5b37312bac2e0a0115718\` (\`verificationId\`), UNIQUE INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` (\`preferenceSetId\`), UNIQUE INDEX \`REL_395aa74996a1f978b4969d114b\` (\`storageAggregatorId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`user_group\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`organizationId\` char(36) NULL, \`communityId\` char(36) NULL, UNIQUE INDEX \`REL_e8e32f1e59c349b406a4752e54\` (\`authorizationId\`), UNIQUE INDEX \`REL_9912e4cfc1e09848a392a65151\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`communication\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`spaceID\` varchar(36) NOT NULL, \`displayName\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, \`updatesId\` char(36) NULL, UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` (\`authorizationId\`), UNIQUE INDEX \`REL_eb99e588873c788a68a035478a\` (\`updatesId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`community_guidelines\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, UNIQUE INDEX \`REL_684b272e6f7459439d41d2879e\` (\`authorizationId\`), UNIQUE INDEX \`REL_3d60fe4fa40d54bad7d51bb4bd\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`role\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(128) NOT NULL, \`credential\` text NOT NULL, \`parentCredentials\` text NOT NULL, \`requiresEntryRole\` tinyint NOT NULL, \`requiresSameRoleInParentRoleSet\` tinyint NOT NULL, \`userPolicy\` text NOT NULL, \`organizationPolicy\` text NOT NULL, \`virtualContributorPolicy\` text NOT NULL, \`roleSetId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`form\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`questions\` text NOT NULL, \`description\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`library\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_3879db652f2421337691219ace\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`license_policy\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`credentialRulesStr\` text NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_23d4d78ea8db637df031f86f03\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`license_plan\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` text NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`sortOrder\` int NOT NULL, \`pricePerMonth\` decimal(10,2) NULL, \`isFree\` tinyint NOT NULL DEFAULT 0, \`trialEnabled\` tinyint NOT NULL DEFAULT 0, \`requiresPaymentMethod\` tinyint NOT NULL DEFAULT 0, \`requiresContactSupport\` tinyint NOT NULL DEFAULT 0, \`licenseCredential\` text NOT NULL, \`type\` varchar(128) NOT NULL, \`assignToNewOrganizationAccounts\` tinyint NOT NULL DEFAULT 0, \`assignToNewUserAccounts\` tinyint NOT NULL DEFAULT 0, \`licensingId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`licensing\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`licensePolicyId\` char(36) NULL, UNIQUE INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` (\`authorizationId\`), UNIQUE INDEX \`REL_a5dae5a376dd49c7c076893d40\` (\`licensePolicyId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`discussion\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`category\` text NOT NULL, \`createdBy\` char(36) NOT NULL, \`privacy\` varchar(255) NOT NULL DEFAULT 'authenticated', \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`commentsId\` char(36) NULL, \`forumId\` char(36) NULL, UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` (\`authorizationId\`), UNIQUE INDEX \`REL_2d8a3ca181c3f0346817685d21\` (\`profileId\`), UNIQUE INDEX \`REL_5337074c9b818bb63e6f314c80\` (\`commentsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`forum\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`discussionCategories\` text NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_3b0c92945f36d06f37de80285d\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`platform\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`forumId\` char(36) NULL, \`libraryId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, \`licensingId\` char(36) NULL, UNIQUE INDEX \`REL_9f621c51dd854634d8766a9cfa\` (\`authorizationId\`), UNIQUE INDEX \`REL_dd88d373c64b04e24705d575c9\` (\`forumId\`), UNIQUE INDEX \`REL_ca469f5ec53a7719d155d60aca\` (\`libraryId\`), UNIQUE INDEX \`REL_f516dd9a46616999c7e9a6adc1\` (\`storageAggregatorId\`), UNIQUE INDEX \`REL_425bbb4b951f7f4629710763fc\` (\`licensingId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`platform_invitation\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`roleSetInvitedToParent\` tinyint NOT NULL DEFAULT 0, \`roleSetExtraRole\` varchar(128) NULL, \`platformRole\` varchar(128) NULL, \`email\` varchar(128) NOT NULL, \`firstName\` varchar(128) NULL, \`lastName\` varchar(128) NULL, \`createdBy\` char(36) NOT NULL, \`welcomeMessage\` varchar(512) NULL, \`profileCreated\` tinyint NOT NULL DEFAULT 0, \`authorizationId\` char(36) NULL, \`roleSetId\` char(36) NULL, \`platformId\` char(36) NULL, UNIQUE INDEX \`REL_c0448d2c992a62c9c11bd0f142\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`nvp\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(128) NOT NULL, \`value\` varchar(512) NOT NULL, \`sortOrder\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`user\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`communicationID\` varchar(255) NOT NULL, \`accountID\` char(36) NOT NULL, \`rowId\` int NOT NULL AUTO_INCREMENT, \`accountUpn\` varchar(128) NOT NULL, \`firstName\` varchar(128) NOT NULL, \`lastName\` varchar(128) NOT NULL, \`email\` varchar(512) NOT NULL, \`phone\` varchar(128) NULL, \`serviceProfile\` tinyint NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`agentId\` char(36) NULL, \`preferenceSetId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, UNIQUE INDEX \`IDX_266bc44a18601f893566962df6\` (\`rowId\`), UNIQUE INDEX \`REL_09f909622aa177a097256b7cc2\` (\`authorizationId\`), UNIQUE INDEX \`REL_9466682df91534dd95e4dbaa61\` (\`profileId\`), UNIQUE INDEX \`REL_b61c694cacfab25533bd23d9ad\` (\`agentId\`), UNIQUE INDEX \`REL_028322b763dc94242dc9f638f9\` (\`preferenceSetId\`), UNIQUE INDEX \`REL_10458c50c10436b6d589b40e5c\` (\`storageAggregatorId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`application\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`lifecycleId\` char(36) NULL, \`userId\` char(36) NULL, \`roleSetId\` char(36) NULL, UNIQUE INDEX \`REL_56f5614fff0028d40370499582\` (\`authorizationId\`), UNIQUE INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` (\`lifecycleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`invitation\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`invitedContributorID\` char(36) NOT NULL, \`createdBy\` char(36) NOT NULL, \`welcomeMessage\` varchar(512) NULL, \`invitedToParent\` tinyint NOT NULL DEFAULT 0, \`contributorType\` varchar(128) NOT NULL, \`extraRole\` varchar(128) NULL, \`authorizationId\` char(36) NULL, \`lifecycleId\` char(36) NULL, \`roleSetId\` char(36) NULL, UNIQUE INDEX \`REL_b132226941570cb650a4023d49\` (\`authorizationId\`), UNIQUE INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` (\`lifecycleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`role_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`entryRoleType\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, \`applicationFormId\` char(36) NULL, \`parentRoleSetId\` char(36) NULL, UNIQUE INDEX \`REL_b038f74c8d4eadb839e78b99ce\` (\`authorizationId\`), UNIQUE INDEX \`REL_00905b142498f63e76d38fb254\` (\`applicationFormId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`community\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`parentID\` varchar(36) NOT NULL, \`authorizationId\` char(36) NULL, \`communicationId\` char(36) NULL, \`guidelinesId\` char(36) NULL, \`roleSetId\` char(36) NULL, UNIQUE INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` (\`authorizationId\`), UNIQUE INDEX \`REL_7fbe50fa78a37776ad962cb764\` (\`communicationId\`), UNIQUE INDEX \`REL_2e7dd2fa8c829352cfbecb2cc9\` (\`guidelinesId\`), UNIQUE INDEX \`REL_3b8f390d76263ef5996869da07\` (\`roleSetId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`actor\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`value\` text NULL, \`impact\` varchar(255) NULL, \`authorizationId\` char(36) NULL, \`actorGroupId\` char(36) NULL, UNIQUE INDEX \`REL_a2afa3851ea733de932251b3a1\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`actor_group\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`authorizationId\` char(36) NULL, \`ecosystemModelId\` char(36) NULL, UNIQUE INDEX \`REL_bde98d59e8984e7d17034c3b93\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`ecosystem_model\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`description\` varchar(255) NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_658580aea4e1a892227e27db90\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`context\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`vision\` text NULL, \`impact\` text NULL, \`who\` text NULL, \`authorizationId\` char(36) NULL, \`ecosystemModelId\` char(36) NULL, UNIQUE INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` (\`authorizationId\`), UNIQUE INDEX \`REL_a03169c3f86480ba3863924f4d\` (\`ecosystemModelId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`type\` varchar(128) NOT NULL, \`postDefaultDescription\` text NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`templatesSetId\` char(36) NULL, \`innovationFlowId\` char(36) NULL, \`communityGuidelinesId\` char(36) NULL, \`calloutId\` char(36) NULL, \`whiteboardId\` char(36) NULL, \`collaborationId\` char(36) NULL, UNIQUE INDEX \`REL_4318f97beabd362a8a09e9d320\` (\`authorizationId\`), UNIQUE INDEX \`REL_f58c3b144b6e010969e199beef\` (\`profileId\`), UNIQUE INDEX \`REL_45cf273f30c1fa509456b6b0dd\` (\`innovationFlowId\`), UNIQUE INDEX \`REL_eedeae5e63f9a9c3a0161541e9\` (\`communityGuidelinesId\`), UNIQUE INDEX \`REL_c6e4d1a07781a809ad3b3ee826\` (\`calloutId\`), UNIQUE INDEX \`REL_f09090a77e07377eefb3f731d9\` (\`whiteboardId\`), UNIQUE INDEX \`REL_21fdaf6dc88bdd6e8839e29b0b\` (\`collaborationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`templates_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_eb0176ef4b98c143322aa6f809\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`space_defaults\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`innovationFlowTemplateId\` char(36) NULL, UNIQUE INDEX \`REL_413ba75964e5a534e4bfa54846\` (\`authorizationId\`), UNIQUE INDEX \`REL_592a23e68922853bae6ebecd85\` (\`innovationFlowTemplateId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`space\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`rowId\` int NOT NULL AUTO_INCREMENT, \`settingsStr\` text NOT NULL, \`type\` varchar(128) NOT NULL, \`levelZeroSpaceID\` char(36) NULL, \`level\` int NOT NULL, \`visibility\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`parentSpaceId\` char(36) NULL, \`accountId\` char(36) NULL, \`collaborationId\` char(36) NULL, \`contextId\` char(36) NULL, \`communityId\` char(36) NULL, \`agentId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, \`libraryId\` char(36) NULL, \`defaultsId\` char(36) NULL, UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` (\`rowId\`), UNIQUE INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` (\`authorizationId\`), UNIQUE INDEX \`REL_b4250035291aac1329d59224a9\` (\`profileId\`), UNIQUE INDEX \`REL_ea06eb8894469a0f262d929bf0\` (\`collaborationId\`), UNIQUE INDEX \`REL_cc0b08eb9679d3daa95153c2af\` (\`contextId\`), UNIQUE INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` (\`communityId\`), UNIQUE INDEX \`REL_9c664d684f987a735678b0ba82\` (\`agentId\`), UNIQUE INDEX \`REL_980c4643d7d9de1b97bc39f518\` (\`storageAggregatorId\`), UNIQUE INDEX \`REL_43559aeadc1a5169d17e81b3d4\` (\`libraryId\`), UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` (\`defaultsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`ai_persona\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`aiPersonaServiceID\` varchar(128) NOT NULL, \`description\` text NULL, \`dataAccessMode\` varchar(128) NOT NULL, \`interactionModes\` text NOT NULL, \`bodyOfKnowledge\` text NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`virtual_contributor\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`communicationID\` varchar(255) NOT NULL, \`listedInStore\` tinyint NOT NULL, \`searchVisibility\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`agentId\` char(36) NULL, \`accountId\` char(36) NULL, \`aiPersonaId\` char(36) NOT NULL, UNIQUE INDEX \`REL_e2eaa2213ac4454039cd8abc07\` (\`authorizationId\`), UNIQUE INDEX \`REL_4504c37764f6962ccbd165a21d\` (\`profileId\`), UNIQUE INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` (\`agentId\`), UNIQUE INDEX \`REL_55b8101bdf4f566645e928c26e\` (\`aiPersonaId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`innovation_pack\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`listedInStore\` tinyint NOT NULL, \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account', \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`accountId\` char(36) NULL, \`templatesSetId\` char(36) NULL, UNIQUE INDEX \`REL_8af8122897b05315e7eb892525\` (\`authorizationId\`), UNIQUE INDEX \`REL_5facd6d188068a5a1c5b6f07fc\` (\`profileId\`), UNIQUE INDEX \`REL_a1441e46c8d36090e1f6477cea\` (\`templatesSetId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`account\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(128) NULL, \`authorizationId\` char(36) NULL, \`agentId\` char(36) NULL, \`storageAggregatorId\` char(36) NULL, UNIQUE INDEX \`REL_91a165c1091a6959cc19d52239\` (\`authorizationId\`), UNIQUE INDEX \`REL_833582df0c439ab8c9adc5240d\` (\`agentId\`), UNIQUE INDEX \`REL_950221e932175dc7cf7c006488\` (\`storageAggregatorId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`innovation_hub\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`nameID\` varchar(36) NOT NULL, \`subdomain\` varchar(63) NOT NULL, \`type\` varchar(255) NOT NULL, \`spaceVisibilityFilter\` varchar(255) NULL, \`spaceListFilter\` text NULL, \`listedInStore\` tinyint NOT NULL, \`searchVisibility\` varchar(128) NOT NULL DEFAULT 'account', \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`accountId\` char(36) NULL, UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` (\`nameID\`), UNIQUE INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` (\`subdomain\`), UNIQUE INDEX \`REL_b411e4f27d77a96eccdabbf4b4\` (\`authorizationId\`), UNIQUE INDEX \`REL_36c8905c2c6c59467c60d94fd8\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`activity\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`rowId\` int NOT NULL AUTO_INCREMENT, \`triggeredBy\` char(36) NOT NULL, \`resourceID\` char(36) NOT NULL, \`parentID\` char(36) NULL, \`collaborationID\` char(36) NOT NULL, \`messageID\` char(44) NULL, \`visibility\` tinyint NOT NULL, \`description\` varchar(512) NULL, \`type\` varchar(128) NOT NULL, UNIQUE INDEX \`IDX_07a39cea9426b689be25fd61de\` (\`rowId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`ai_server\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_9d520fa5fed56042918e48fc4b\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`ai_persona_service\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`engine\` varchar(128) NOT NULL, \`dataAccessMode\` varchar(128) NOT NULL, \`prompt\` text NOT NULL, \`bodyOfKnowledgeType\` varchar(128) NOT NULL, \`bodyOfKnowledgeID\` varchar(128) NULL, \`bodyOfKnowledgeLastUpdated\` datetime NULL, \`externalConfig\` text NULL, \`authorizationId\` char(36) NULL, \`aiServerId\` char(36) NULL, UNIQUE INDEX \`REL_79206feb0038b1c5597668dc4b\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`application_questions\` (\`applicationId\` char(36) NOT NULL, \`nvpId\` char(36) NOT NULL, INDEX \`IDX_8495fae86f13836b0745642baa\` (\`applicationId\`), INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` (\`nvpId\`), PRIMARY KEY (\`applicationId\`, \`nvpId\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` ADD CONSTRAINT \`FK_96f23f044acf305c1699e0319d2\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_eb59b98ee6ef26c993d0d75c83c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_81fc213b2d9ad0cddeab1a9ce64\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_644155610ddc40dc4e19781c8f0\` FOREIGN KEY (\`tagsetTemplateId\`) REFERENCES \`tagset_template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_4fbd109f9bb84f58b7a3c60649c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_1104f3ef8497ca40d99b9f46b87\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_d9e2dfcccf59233c17cc6bc6418\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_851e50ec4be7c62a1f9b9a430bf\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` ADD CONSTRAINT \`FK_9fb9257b14ec21daf5bc9aa4c8e\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_f2f48b57269987b13b415a00587\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` ADD CONSTRAINT \`FK_11d0ed50a26da5513f7e4347847\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_a96475631aba7dce41db03cc8b2\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_432056041df0e4337b17ff7b09d\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_4a1c74fd2a61b32d9d9500e0650\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_73e8ae665a49366ca7e2866a45d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_2f46c698fc4c19a8cc233c5f255\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` ADD CONSTRAINT \`FK_d6f78c95ff41cdd30e505a4ebbb\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_d1d94dd8e0c417b4188a05ccbca\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_d3b86160bb7d704212382b0ca44\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_3f9e9e2798d2a4d84b16ee8477c\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_c9d7c2c4eb8a1d012ddc6605da9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_f53e2d266432e58e538a366705d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_8bc0e1f40be5816d3a593cbf7fa\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_390343b22abec869bf800419333\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_970844fcd10c2b6df7c1b49eacf\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_042b9825d770d6b3009ae206c2f\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_07f249ac87502495710a62c5c01\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_3bfc8c1aaec1395cc148268d3cd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_7370de8eb79ed00b0d403f2299a\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_cf776244b01436d8ca5cc762848\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_36b0da55acff774d0845aeb55f2\` FOREIGN KEY (\`contributionDefaultsId\`) REFERENCES \`callout_contribution_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_8ee86afa2808a4ab523b9ee6c5e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_9349e137959f3ca5818c2e62b3f\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_b5069b11030e9608ee4468f850d\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_80ab7835e1749581a27462eb87f\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_6e74d59afda096b68d12a699691\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_5fe58ece01b48496aebc04733da\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_56aae15a664b2889a1a11c2cf82\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_a6e050daa4c7a3ab1e411c36517\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_96a8cbe1706f459fd7d883be9bd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_b7ece56376ac7ca0b9a56c33b3a\` FOREIGN KEY (\`tagsetTemplateSetId\`) REFERENCES \`tagset_template_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_f67a2d25c945269d602c182fbc0\` FOREIGN KEY (\`timelineId\`) REFERENCES \`timeline\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_35c6b1de6d4d89dfe8e9c85d771\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_c66eddab0caacb1ef8d46bcafdb\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` ADD CONSTRAINT \`FK_1cc3b275fc2a9d9d9b0ae33b310\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_b4cf0f96bf08cf396f683555229\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_46d60bf133073f749b8f07e534c\` FOREIGN KEY (\`preferenceDefinitionId\`) REFERENCES \`preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_f4b5742f589e2ac8bfe48b708c0\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_8e76dcf171c45875c44febb1d8d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD CONSTRAINT \`FK_dbe0929355f82e5995f0b7fd5e2\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` ADD CONSTRAINT \`FK_8ed9d1af584fa62f1ad3405b33b\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_e0e150e4f11d906b931b46a2d89\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_d2cb77c14644156ec8e865608e0\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_7f1bec8979b57ed7ebd392a2ca9\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_5a72d5b37312bac2e0a01157185\` FOREIGN KEY (\`verificationId\`) REFERENCES \`organization_verification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_58fd47c4a6ac8df9fe2bcaed874\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_395aa74996a1f978b4969d114b1\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_e8e32f1e59c349b406a4752e545\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9912e4cfc1e09848a392a651514\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_694ebec955a90e999d9926b7da8\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organization\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` ADD CONSTRAINT \`FK_9fcc131f256e969d773327f07cb\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_eb99e588873c788a68a035478ab\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_684b272e6f7459439d41d2879ee\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` ADD CONSTRAINT \`FK_3d60fe4fa40d54bad7d51bb4bd1\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` ADD CONSTRAINT \`FK_66d695b73839e9b66ff1350d34f\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_3879db652f2421337691219ace8\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` ADD CONSTRAINT \`FK_23d4d78ea8db637df031f86f030\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_3030904030f5d30f483b49905d1\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_0c6a4d0a6c13a3f5df6ac015096\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_a5dae5a376dd49c7c076893d40b\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_5337074c9b818bb63e6f314c808\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_0de78853c1ee793f61bda7eff79\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` ADD CONSTRAINT \`FK_3b0c92945f36d06f37de80285dd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_9f621c51dd854634d8766a9cfaf\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_dd88d373c64b04e24705d575c99\` FOREIGN KEY (\`forumId\`) REFERENCES \`forum\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_ca469f5ec53a7719d155d60aca1\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_f516dd9a46616999c7e9a6adc15\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_425bbb4b951f7f4629710763fc0\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_c0448d2c992a62c9c11bd0f1422\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_562dce4a08bb214f08107b3631e\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_809c1e6cf3ef6be03a0a1db3f70\` FOREIGN KEY (\`platformId\`) REFERENCES \`platform\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_09f909622aa177a097256b7cc22\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_9466682df91534dd95e4dbaa616\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_b61c694cacfab25533bd23d9add\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_028322b763dc94242dc9f638f9b\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_10458c50c10436b6d589b40e5ca\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_56f5614fff0028d403704995822\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_7ec2857c7d8d16432ffca1cb3d9\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_b4ae3fea4a24b4be1a86dacf8a2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_8fb220ad1ac1f9c86ec39d134e4\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b132226941570cb650a4023d493\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_b0c80ccf319a1c7a7af12b39987\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_6a3b86c6db10582baae7058f5b9\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_b038f74c8d4eadb839e78b99ce5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_00905b142498f63e76d38fb254e\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_86acc254af20d20c9d87c3503d5\` FOREIGN KEY (\`parentRoleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_6e7584bfb417bd0f8e8696ab585\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_2e7dd2fa8c829352cfbecb2cc93\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3b8f390d76263ef5996869da071\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_a2afa3851ea733de932251b3a1f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` ADD CONSTRAINT \`FK_0f9d41ee193d631a5439bb4f404\` FOREIGN KEY (\`actorGroupId\`) REFERENCES \`actor_group\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_bde98d59e8984e7d17034c3b937\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` ADD CONSTRAINT \`FK_cbb1d7afa052a184471723d3297\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` ADD CONSTRAINT \`FK_658580aea4e1a892227e27db902\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_5f0dbc3b097ef297bd5f4ddb1a9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_a03169c3f86480ba3863924f4d7\` FOREIGN KEY (\`ecosystemModelId\`) REFERENCES \`ecosystem_model\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_4318f97beabd362a8a09e9d3203\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f58c3b144b6e010969e199beeff\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c7f54e6269c013d9c273f025edd\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_45cf273f30c1fa509456b6b0ddf\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_eedeae5e63f9a9c3a0161541e98\` FOREIGN KEY (\`communityGuidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_c6e4d1a07781a809ad3b3ee8265\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_f09090a77e07377eefb3f731d9f\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_21fdaf6dc88bdd6e8839e29b0bd\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD CONSTRAINT \`FK_eb0176ef4b98c143322aa6f8090\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_413ba75964e5a534e4bfa54846e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_592a23e68922853bae6ebecd85e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_8d03fd2c8e8411ec9192c79cd99\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_b4250035291aac1329d59224a96\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ef1ff4ac7f613cc0677e2295b30\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6bdeffaf6ea6159b4672a2aed70\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_ea06eb8894469a0f262d929bf06\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_cc0b08eb9679d3daa95153c2af5\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_68fa2c2b00cc1ed77e7c225e8ba\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_9c664d684f987a735678b0ba825\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_980c4643d7d9de1b97bc39f5185\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_43559aeadc1a5169d17e81b3d45\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6b1efee39d076d9f7ecb8fef4cd\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_293f0d3ef60cb0ca0006044ecfd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_e2eaa2213ac4454039cd8abc07d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_4504c37764f6962ccbd165a21de\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_a8890dcd65b8c3ee6e160d33f3a\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_55b8101bdf4f566645e928c26e3\` FOREIGN KEY (\`aiPersonaId\`) REFERENCES \`ai_persona\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_8af8122897b05315e7eb8925253\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_5facd6d188068a5a1c5b6f07fc3\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_51014590f9644e6ff9e0536f40f\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_a1441e46c8d36090e1f6477cea5\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_91a165c1091a6959cc19d522399\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_833582df0c439ab8c9adc5240d1\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_950221e932175dc7cf7c0064887\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_b411e4f27d77a96eccdabbf4b45\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_36c8905c2c6c59467c60d94fd8a\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD CONSTRAINT \`FK_156fd30246eb151b9d17716abf5\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` ADD CONSTRAINT \`FK_9d520fa5fed56042918e48fc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_79206feb0038b1c5597668dc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_b9f20da98058d7bd474152ed6ce\` FOREIGN KEY (\`aiServerId\`) REFERENCES \`ai_server\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_8495fae86f13836b0745642baa8\` FOREIGN KEY (\`applicationId\`) REFERENCES \`application\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` ADD CONSTRAINT \`FK_fe50118fd82e7fe2f74f986a195\` FOREIGN KEY (\`nvpId\`) REFERENCES \`nvp\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `CREATE TABLE \`query-result-cache\` (\`id\` int NOT NULL AUTO_INCREMENT, \`identifier\` varchar(255) NULL, \`time\` bigint NOT NULL, \`duration\` int NOT NULL, \`query\` text NOT NULL, \`result\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`query-result-cache\``);
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_fe50118fd82e7fe2f74f986a195\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application_questions\` DROP FOREIGN KEY \`FK_8495fae86f13836b0745642baa8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP FOREIGN KEY \`FK_b9f20da98058d7bd474152ed6ce\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP FOREIGN KEY \`FK_79206feb0038b1c5597668dc4b5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` DROP FOREIGN KEY \`FK_9d520fa5fed56042918e48fc4b5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_156fd30246eb151b9d17716abf5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_36c8905c2c6c59467c60d94fd8a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP FOREIGN KEY \`FK_b411e4f27d77a96eccdabbf4b45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_950221e932175dc7cf7c0064887\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_833582df0c439ab8c9adc5240d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_91a165c1091a6959cc19d522399\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_a1441e46c8d36090e1f6477cea5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_51014590f9644e6ff9e0536f40f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_5facd6d188068a5a1c5b6f07fc3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` DROP FOREIGN KEY \`FK_8af8122897b05315e7eb8925253\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_55b8101bdf4f566645e928c26e3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_7a962c9b04b0d197bc3c93262a7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_a8890dcd65b8c3ee6e160d33f3a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_4504c37764f6962ccbd165a21de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_e2eaa2213ac4454039cd8abc07d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_293f0d3ef60cb0ca0006044ecfd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_43559aeadc1a5169d17e81b3d45\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_980c4643d7d9de1b97bc39f5185\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_9c664d684f987a735678b0ba825\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_68fa2c2b00cc1ed77e7c225e8ba\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_cc0b08eb9679d3daa95153c2af5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ea06eb8894469a0f262d929bf06\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bdeffaf6ea6159b4672a2aed70\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_ef1ff4ac7f613cc0677e2295b30\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_b4250035291aac1329d59224a96\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_8d03fd2c8e8411ec9192c79cd99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_592a23e68922853bae6ebecd85e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_413ba75964e5a534e4bfa54846e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP FOREIGN KEY \`FK_eb0176ef4b98c143322aa6f8090\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_21fdaf6dc88bdd6e8839e29b0bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_f09090a77e07377eefb3f731d9f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_c6e4d1a07781a809ad3b3ee8265\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_eedeae5e63f9a9c3a0161541e98\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_45cf273f30c1fa509456b6b0ddf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_c7f54e6269c013d9c273f025edd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_f58c3b144b6e010969e199beeff\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_4318f97beabd362a8a09e9d3203\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_a03169c3f86480ba3863924f4d7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_5f0dbc3b097ef297bd5f4ddb1a9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ecosystem_model\` DROP FOREIGN KEY \`FK_658580aea4e1a892227e27db902\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_cbb1d7afa052a184471723d3297\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor_group\` DROP FOREIGN KEY \`FK_bde98d59e8984e7d17034c3b937\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_0f9d41ee193d631a5439bb4f404\``
    );
    await queryRunner.query(
      `ALTER TABLE \`actor\` DROP FOREIGN KEY \`FK_a2afa3851ea733de932251b3a1f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3b8f390d76263ef5996869da071\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_2e7dd2fa8c829352cfbecb2cc93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_6e7584bfb417bd0f8e8696ab585\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_86acc254af20d20c9d87c3503d5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_00905b142498f63e76d38fb254e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_b038f74c8d4eadb839e78b99ce5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_6a3b86c6db10582baae7058f5b9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b0c80ccf319a1c7a7af12b39987\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_b132226941570cb650a4023d493\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_8fb220ad1ac1f9c86ec39d134e4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_b4ae3fea4a24b4be1a86dacf8a2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_7ec2857c7d8d16432ffca1cb3d9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_56f5614fff0028d403704995822\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_10458c50c10436b6d589b40e5ca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_028322b763dc94242dc9f638f9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_b61c694cacfab25533bd23d9add\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_9466682df91534dd95e4dbaa616\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_09f909622aa177a097256b7cc22\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_809c1e6cf3ef6be03a0a1db3f70\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_562dce4a08bb214f08107b3631e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_c0448d2c992a62c9c11bd0f1422\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_425bbb4b951f7f4629710763fc0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_f516dd9a46616999c7e9a6adc15\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_ca469f5ec53a7719d155d60aca1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_dd88d373c64b04e24705d575c99\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_9f621c51dd854634d8766a9cfaf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`forum\` DROP FOREIGN KEY \`FK_3b0c92945f36d06f37de80285dd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_0de78853c1ee793f61bda7eff79\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_5337074c9b818bb63e6f314c808\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_a5dae5a376dd49c7c076893d40b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` DROP FOREIGN KEY \`FK_0c6a4d0a6c13a3f5df6ac015096\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_3030904030f5d30f483b49905d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` DROP FOREIGN KEY \`FK_23d4d78ea8db637df031f86f030\``
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` DROP FOREIGN KEY \`FK_3879db652f2421337691219ace8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` DROP FOREIGN KEY \`FK_66d695b73839e9b66ff1350d34f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_3d60fe4fa40d54bad7d51bb4bd1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines\` DROP FOREIGN KEY \`FK_684b272e6f7459439d41d2879ee\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_eb99e588873c788a68a035478ab\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9fcc131f256e969d773327f07cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_694ebec955a90e999d9926b7da8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_9912e4cfc1e09848a392a651514\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP FOREIGN KEY \`FK_e8e32f1e59c349b406a4752e545\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_395aa74996a1f978b4969d114b1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_58fd47c4a6ac8df9fe2bcaed874\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_5a72d5b37312bac2e0a01157185\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_7f1bec8979b57ed7ebd392a2ca9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_d2cb77c14644156ec8e865608e0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_e0e150e4f11d906b931b46a2d89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agent\` DROP FOREIGN KEY \`FK_8ed9d1af584fa62f1ad3405b33b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` DROP FOREIGN KEY \`FK_dbe0929355f82e5995f0b7fd5e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` DROP FOREIGN KEY \`FK_8e76dcf171c45875c44febb1d8d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_f4b5742f589e2ac8bfe48b708c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_46d60bf133073f749b8f07e534c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_b4cf0f96bf08cf396f683555229\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_1cc3b275fc2a9d9d9b0ae33b310\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_verification\` DROP FOREIGN KEY \`FK_c66eddab0caacb1ef8d46bcafdb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_35c6b1de6d4d89dfe8e9c85d771\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_f67a2d25c945269d602c182fbc0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_b7ece56376ac7ca0b9a56c33b3a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_96a8cbe1706f459fd7d883be9bd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_a6e050daa4c7a3ab1e411c36517\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_56aae15a664b2889a1a11c2cf82\``
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_5fe58ece01b48496aebc04733da\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP FOREIGN KEY \`FK_6e74d59afda096b68d12a699691\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_80ab7835e1749581a27462eb87f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_b5069b11030e9608ee4468f850d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_9349e137959f3ca5818c2e62b3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_8ee86afa2808a4ab523b9ee6c5e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_36b0da55acff774d0845aeb55f2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_cf776244b01436d8ca5cc762848\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_7370de8eb79ed00b0d403f2299a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_bdf2d0eced5c95968a85caaaaee\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_97fefc97fb254c30577696e1c0a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_5e34f9a356f6254b8da24f8947b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_dfa86c46f509a61c6510536cd9a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_3bfc8c1aaec1395cc148268d3cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_07f249ac87502495710a62c5c01\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_042b9825d770d6b3009ae206c2f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_970844fcd10c2b6df7c1b49eacf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_390343b22abec869bf800419333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_8bc0e1f40be5816d3a593cbf7fa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_f53e2d266432e58e538a366705d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_c9d7c2c4eb8a1d012ddc6605da9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_3f9e9e2798d2a4d84b16ee8477c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_d3b86160bb7d704212382b0ca44\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``
    );
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` DROP FOREIGN KEY \`FK_d6f78c95ff41cdd30e505a4ebbb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_2f46c698fc4c19a8cc233c5f255\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_73e8ae665a49366ca7e2866a45d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_4a1c74fd2a61b32d9d9500e0650\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_432056041df0e4337b17ff7b09d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_a96475631aba7dce41db03cc8b2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_11d0ed50a26da5513f7e4347847\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_bucket\` DROP FOREIGN KEY \`FK_f2f48b57269987b13b415a00587\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_0647707288c243e60091c8d8620\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_b80c28f5335ab5442f63c644d94\``
    );
    await queryRunner.query(
      `ALTER TABLE \`storage_aggregator\` DROP FOREIGN KEY \`FK_f3b4d59c0b805c9c1ecb0070e16\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_9fb9257b14ec21daf5bc9aa4c8e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_851e50ec4be7c62a1f9b9a430bf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`document\` DROP FOREIGN KEY \`FK_d9e2dfcccf59233c17cc6bc6418\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_1104f3ef8497ca40d99b9f46b87\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_4fbd109f9bb84f58b7a3c60649c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_644155610ddc40dc4e19781c8f0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_81fc213b2d9ad0cddeab1a9ce64\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_eb59b98ee6ef26c993d0d75c83c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset_template\` DROP FOREIGN KEY \`FK_96f23f044acf305c1699e0319d2\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fe50118fd82e7fe2f74f986a19\` ON \`application_questions\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8495fae86f13836b0745642baa\` ON \`application_questions\``
    );
    await queryRunner.query(`DROP TABLE \`application_questions\``);
    await queryRunner.query(
      `DROP INDEX \`REL_79206feb0038b1c5597668dc4b\` ON \`ai_persona_service\``
    );
    await queryRunner.query(`DROP TABLE \`ai_persona_service\``);
    await queryRunner.query(
      `DROP INDEX \`REL_9d520fa5fed56042918e48fc4b\` ON \`ai_server\``
    );
    await queryRunner.query(`DROP TABLE \`ai_server\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_07a39cea9426b689be25fd61de\` ON \`activity\``
    );
    await queryRunner.query(`DROP TABLE \`activity\``);
    await queryRunner.query(
      `DROP INDEX \`REL_36c8905c2c6c59467c60d94fd8\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b411e4f27d77a96eccdabbf4b4\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8f35d04d098bb6c7c57a9a83ac\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` ON \`innovation_hub\``
    );
    await queryRunner.query(`DROP TABLE \`innovation_hub\``);
    await queryRunner.query(
      `DROP INDEX \`REL_950221e932175dc7cf7c006488\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_833582df0c439ab8c9adc5240d\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_91a165c1091a6959cc19d52239\` ON \`account\``
    );
    await queryRunner.query(`DROP TABLE \`account\``);
    await queryRunner.query(
      `DROP INDEX \`REL_a1441e46c8d36090e1f6477cea\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5facd6d188068a5a1c5b6f07fc\` ON \`innovation_pack\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8af8122897b05315e7eb892525\` ON \`innovation_pack\``
    );
    await queryRunner.query(`DROP TABLE \`innovation_pack\``);
    await queryRunner.query(
      `DROP INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\``
    );
    await queryRunner.query(`DROP TABLE \`virtual_contributor\``);
    await queryRunner.query(
      `DROP INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` ON \`ai_persona\``
    );
    await queryRunner.query(`DROP TABLE \`ai_persona\``);
    await queryRunner.query(
      `DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_43559aeadc1a5169d17e81b3d4\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_980c4643d7d9de1b97bc39f518\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9c664d684f987a735678b0ba82\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_68fa2c2b00cc1ed77e7c225e8b\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cc0b08eb9679d3daa95153c2af\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ea06eb8894469a0f262d929bf0\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b4250035291aac1329d59224a9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8d03fd2c8e8411ec9192c79cd9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0f03c61020ea0dfa0198c60304\` ON \`space\``
    );
    await queryRunner.query(`DROP TABLE \`space\``);
    await queryRunner.query(
      `DROP INDEX \`REL_592a23e68922853bae6ebecd85\` ON \`space_defaults\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_413ba75964e5a534e4bfa54846\` ON \`space_defaults\``
    );
    await queryRunner.query(`DROP TABLE \`space_defaults\``);
    await queryRunner.query(
      `DROP INDEX \`REL_eb0176ef4b98c143322aa6f809\` ON \`templates_set\``
    );
    await queryRunner.query(`DROP TABLE \`templates_set\``);
    await queryRunner.query(
      `DROP INDEX \`REL_21fdaf6dc88bdd6e8839e29b0b\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f09090a77e07377eefb3f731d9\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c6e4d1a07781a809ad3b3ee826\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eedeae5e63f9a9c3a0161541e9\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_45cf273f30c1fa509456b6b0dd\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f58c3b144b6e010969e199beef\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4318f97beabd362a8a09e9d320\` ON \`template\``
    );
    await queryRunner.query(`DROP TABLE \`template\``);
    await queryRunner.query(
      `DROP INDEX \`REL_a03169c3f86480ba3863924f4d\` ON \`context\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5f0dbc3b097ef297bd5f4ddb1a\` ON \`context\``
    );
    await queryRunner.query(`DROP TABLE \`context\``);
    await queryRunner.query(
      `DROP INDEX \`REL_658580aea4e1a892227e27db90\` ON \`ecosystem_model\``
    );
    await queryRunner.query(`DROP TABLE \`ecosystem_model\``);
    await queryRunner.query(
      `DROP INDEX \`REL_bde98d59e8984e7d17034c3b93\` ON \`actor_group\``
    );
    await queryRunner.query(`DROP TABLE \`actor_group\``);
    await queryRunner.query(
      `DROP INDEX \`REL_a2afa3851ea733de932251b3a1\` ON \`actor\``
    );
    await queryRunner.query(`DROP TABLE \`actor\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3b8f390d76263ef5996869da07\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2e7dd2fa8c829352cfbecb2cc9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7fbe50fa78a37776ad962cb764\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6e7584bfb417bd0f8e8696ab58\` ON \`community\``
    );
    await queryRunner.query(`DROP TABLE \`community\``);
    await queryRunner.query(
      `DROP INDEX \`REL_00905b142498f63e76d38fb254\` ON \`role_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b038f74c8d4eadb839e78b99ce\` ON \`role_set\``
    );
    await queryRunner.query(`DROP TABLE \`role_set\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b0c80ccf319a1c7a7af12b3998\` ON \`invitation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b132226941570cb650a4023d49\` ON \`invitation\``
    );
    await queryRunner.query(`DROP TABLE \`invitation\``);
    await queryRunner.query(
      `DROP INDEX \`REL_7ec2857c7d8d16432ffca1cb3d\` ON \`application\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_56f5614fff0028d40370499582\` ON \`application\``
    );
    await queryRunner.query(`DROP TABLE \`application\``);
    await queryRunner.query(
      `DROP INDEX \`REL_10458c50c10436b6d589b40e5c\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b61c694cacfab25533bd23d9ad\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9466682df91534dd95e4dbaa61\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_09f909622aa177a097256b7cc2\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_266bc44a18601f893566962df6\` ON \`user\``
    );
    await queryRunner.query(`DROP TABLE \`user\``);
    await queryRunner.query(`DROP TABLE \`nvp\``);
    await queryRunner.query(
      `DROP INDEX \`REL_c0448d2c992a62c9c11bd0f142\` ON \`platform_invitation\``
    );
    await queryRunner.query(`DROP TABLE \`platform_invitation\``);
    await queryRunner.query(
      `DROP INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f516dd9a46616999c7e9a6adc1\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ca469f5ec53a7719d155d60aca\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dd88d373c64b04e24705d575c9\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9f621c51dd854634d8766a9cfa\` ON \`platform\``
    );
    await queryRunner.query(`DROP TABLE \`platform\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3b0c92945f36d06f37de80285d\` ON \`forum\``
    );
    await queryRunner.query(`DROP TABLE \`forum\``);
    await queryRunner.query(
      `DROP INDEX \`REL_5337074c9b818bb63e6f314c80\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2d8a3ca181c3f0346817685d21\` ON \`discussion\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\``
    );
    await queryRunner.query(`DROP TABLE \`discussion\``);
    await queryRunner.query(
      `DROP INDEX \`REL_a5dae5a376dd49c7c076893d40\` ON \`licensing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing\``
    );
    await queryRunner.query(`DROP TABLE \`licensing\``);
    await queryRunner.query(`DROP TABLE \`license_plan\``);
    await queryRunner.query(
      `DROP INDEX \`REL_23d4d78ea8db637df031f86f03\` ON \`license_policy\``
    );
    await queryRunner.query(`DROP TABLE \`license_policy\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3879db652f2421337691219ace\` ON \`library\``
    );
    await queryRunner.query(`DROP TABLE \`library\``);
    await queryRunner.query(`DROP TABLE \`form\``);
    await queryRunner.query(`DROP TABLE \`role\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3d60fe4fa40d54bad7d51bb4bd\` ON \`community_guidelines\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_684b272e6f7459439d41d2879e\` ON \`community_guidelines\``
    );
    await queryRunner.query(`DROP TABLE \`community_guidelines\``);
    await queryRunner.query(
      `DROP INDEX \`REL_eb99e588873c788a68a035478a\` ON \`communication\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\``
    );
    await queryRunner.query(`DROP TABLE \`communication\``);
    await queryRunner.query(
      `DROP INDEX \`REL_9912e4cfc1e09848a392a65151\` ON \`user_group\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e8e32f1e59c349b406a4752e54\` ON \`user_group\``
    );
    await queryRunner.query(`DROP TABLE \`user_group\``);
    await queryRunner.query(
      `DROP INDEX \`REL_395aa74996a1f978b4969d114b\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5a72d5b37312bac2e0a0115718\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7f1bec8979b57ed7ebd392a2ca\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d2cb77c14644156ec8e865608e\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e0e150e4f11d906b931b46a2d8\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9fdd8f0bfe04a676822c7265e1\` ON \`organization\``
    );
    await queryRunner.query(`DROP TABLE \`organization\``);
    await queryRunner.query(
      `DROP INDEX \`REL_8ed9d1af584fa62f1ad3405b33\` ON \`agent\``
    );
    await queryRunner.query(`DROP TABLE \`agent\``);
    await queryRunner.query(`DROP TABLE \`credential\``);
    await queryRunner.query(
      `DROP INDEX \`REL_8e76dcf171c45875c44febb1d8\` ON \`preference_set\``
    );
    await queryRunner.query(`DROP TABLE \`preference_set\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b4cf0f96bf08cf396f68355522\` ON \`preference\``
    );
    await queryRunner.query(`DROP TABLE \`preference\``);
    await queryRunner.query(`DROP TABLE \`preference_definition\``);
    await queryRunner.query(
      `DROP INDEX \`REL_1cc3b275fc2a9d9d9b0ae33b31\` ON \`organization_verification\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c66eddab0caacb1ef8d46bcafd\` ON \`organization_verification\``
    );
    await queryRunner.query(`DROP TABLE \`organization_verification\``);
    await queryRunner.query(`DROP TABLE \`lifecycle\``);
    await queryRunner.query(
      `DROP INDEX \`REL_35c6b1de6d4d89dfe8e9c85d77\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f67a2d25c945269d602c182fbc\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b7ece56376ac7ca0b9a56c33b3\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(`DROP TABLE \`collaboration\``);
    await queryRunner.query(
      `DROP INDEX \`REL_96a8cbe1706f459fd7d883be9b\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a6e050daa4c7a3ab1e411c3651\` ON \`innovation_flow\``
    );
    await queryRunner.query(`DROP TABLE \`innovation_flow\``);
    await queryRunner.query(
      `DROP INDEX \`REL_56aae15a664b2889a1a11c2cf8\` ON \`timeline\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5fe58ece01b48496aebc04733d\` ON \`timeline\``
    );
    await queryRunner.query(`DROP TABLE \`timeline\``);
    await queryRunner.query(
      `DROP INDEX \`REL_6e74d59afda096b68d12a69969\` ON \`calendar\``
    );
    await queryRunner.query(`DROP TABLE \`calendar\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b5069b11030e9608ee4468f850\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9349e137959f3ca5818c2e62b3\` ON \`calendar_event\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8ee86afa2808a4ab523b9ee6c5\` ON \`calendar_event\``
    );
    await queryRunner.query(`DROP TABLE \`calendar_event\``);
    await queryRunner.query(
      `DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_36b0da55acff774d0845aeb55f\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cf776244b01436d8ca5cc76284\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(`DROP TABLE \`callout\``);
    await queryRunner.query(
      `DROP INDEX \`REL_bdf2d0eced5c95968a85caaaae\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_97fefc97fb254c30577696e1c0\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5e34f9a356f6254b8da24f8947\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dfa86c46f509a61c6510536cd9\` ON \`callout_contribution\``
    );
    await queryRunner.query(`DROP TABLE \`callout_contribution\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` ON \`link\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_07f249ac87502495710a62c5c0\` ON \`link\``
    );
    await queryRunner.query(`DROP TABLE \`link\``);
    await queryRunner.query(
      `DROP INDEX \`REL_042b9825d770d6b3009ae206c2\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_970844fcd10c2b6df7c1b49eac\` ON \`post\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_390343b22abec869bf80041933\` ON \`post\``
    );
    await queryRunner.query(`DROP TABLE \`post\``);
    await queryRunner.query(`DROP TABLE \`callout_contribution_defaults\``);
    await queryRunner.query(`DROP TABLE \`callout_contribution_policy\``);
    await queryRunner.query(
      `DROP INDEX \`REL_8bc0e1f40be5816d3a593cbf7f\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f53e2d266432e58e538a366705\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c9d7c2c4eb8a1d012ddc6605da\` ON \`callout_framing\``
    );
    await queryRunner.query(`DROP TABLE \`callout_framing\``);
    await queryRunner.query(
      `DROP INDEX \`REL_3f9e9e2798d2a4d84b16ee8477\` ON \`whiteboard\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d3b86160bb7d704212382b0ca4\` ON \`whiteboard\``
    );
    await queryRunner.query(`DROP TABLE \`whiteboard\``);
    await queryRunner.query(
      `DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(`DROP TABLE \`room\``);
    await queryRunner.query(`DROP TABLE \`vc_interaction\``);
    await queryRunner.query(
      `DROP INDEX \`REL_73e8ae665a49366ca7e2866a45\` ON \`reference\``
    );
    await queryRunner.query(`DROP TABLE \`reference\``);
    await queryRunner.query(
      `DROP INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_432056041df0e4337b17ff7b09\` ON \`profile\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a96475631aba7dce41db03cc8b\` ON \`profile\``
    );
    await queryRunner.query(`DROP TABLE \`profile\``);
    await queryRunner.query(
      `DROP INDEX \`REL_f2f48b57269987b13b415a0058\` ON \`storage_bucket\``
    );
    await queryRunner.query(`DROP TABLE \`storage_bucket\``);
    await queryRunner.query(
      `DROP INDEX \`REL_0647707288c243e60091c8d862\` ON \`storage_aggregator\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f3b4d59c0b805c9c1ecb0070e1\` ON \`storage_aggregator\``
    );
    await queryRunner.query(`DROP TABLE \`storage_aggregator\``);
    await queryRunner.query(
      `DROP INDEX \`REL_9fb9257b14ec21daf5bc9aa4c8\` ON \`document\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d9e2dfcccf59233c17cc6bc641\` ON \`document\``
    );
    await queryRunner.query(`DROP TABLE \`document\``);
    await queryRunner.query(`DROP TABLE \`location\``);
    await queryRunner.query(
      `DROP INDEX \`REL_4fbd109f9bb84f58b7a3c60649\` ON \`visual\``
    );
    await queryRunner.query(`DROP TABLE \`visual\``);
    await queryRunner.query(
      `DROP INDEX \`REL_eb59b98ee6ef26c993d0d75c83\` ON \`tagset\``
    );
    await queryRunner.query(`DROP TABLE \`tagset\``);
    await queryRunner.query(`DROP TABLE \`tagset_template\``);
    await queryRunner.query(`DROP TABLE \`tagset_template_set\``);
    await queryRunner.query(`DROP TABLE \`authorization_policy\``);
  }
}
