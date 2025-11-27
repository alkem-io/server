import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1764237534488 implements MigrationInterface {
  name = 'Baseline1764237534488';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "authorization_policy" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "credentialRules" json NOT NULL, "privilegeRules" json NOT NULL, "verifiedCredentialRules" json NOT NULL, "type" character varying(128) NOT NULL, "parentAuthorizationPolicyId" uuid, CONSTRAINT "PK_fe66e152ac920baa9a53a3499b7" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "tagset_template_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, CONSTRAINT "PK_2836cef181f1d38f8ecbe9de246" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "tagset_template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying(128) NOT NULL, "type" character varying(128) NOT NULL, "allowedValues" text NOT NULL, "defaultSelectedValue" character varying(255), "tagsetTemplateSetId" uuid, CONSTRAINT "PK_92ce1dc09c60bf1e11f040133b2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "classification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_42422fc4b9dfe4424046f12d8f" UNIQUE ("authorizationId"), CONSTRAINT "PK_1dc9176492b73104aa3d19ccff4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "tagset" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying(255) NOT NULL DEFAULT 'default', "type" character varying(128) NOT NULL, "tags" text NOT NULL, "authorizationId" uuid, "profileId" uuid, "classificationId" uuid, "tagsetTemplateId" uuid, CONSTRAINT "REL_eb59b98ee6ef26c993d0d75c83" UNIQUE ("authorizationId"), CONSTRAINT "PK_01dda0b4883d2ef450ef898038f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "visual" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying NOT NULL, "uri" character varying(2048) NOT NULL, "minWidth" integer NOT NULL, "maxWidth" integer NOT NULL, "minHeight" integer NOT NULL, "maxHeight" integer NOT NULL, "aspectRatio" numeric(3,1) NOT NULL, "allowedTypes" text NOT NULL, "alternativeText" character varying(120), "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_4fbd109f9bb84f58b7a3c60649" UNIQUE ("authorizationId"), CONSTRAINT "PK_af8132b2ef744e2703ea70799cc" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "location" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "city" character varying(128), "country" character varying(128), "addressLine1" character varying(512), "addressLine2" character varying(512), "stateOrProvince" character varying(128), "postalCode" character varying(128), "geoLocation" json NOT NULL, CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "document" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "createdBy" uuid, "displayName" character varying(512) NOT NULL, "mimeType" character varying(128) NOT NULL, "size" integer NOT NULL, "externalID" character varying(128) NOT NULL, "temporaryLocation" boolean NOT NULL DEFAULT false, "authorizationId" uuid, "storageBucketId" uuid, "tagsetId" uuid, CONSTRAINT "REL_d9e2dfcccf59233c17cc6bc641" UNIQUE ("authorizationId"), CONSTRAINT "REL_9fb9257b14ec21daf5bc9aa4c8" UNIQUE ("tagsetId"), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "storage_aggregator" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128), "authorizationId" uuid, "parentStorageAggregatorId" uuid, "directStorageId" uuid, CONSTRAINT "REL_f3b4d59c0b805c9c1ecb0070e1" UNIQUE ("authorizationId"), CONSTRAINT "REL_0647707288c243e60091c8d862" UNIQUE ("directStorageId"), CONSTRAINT "PK_66372534c4528a713d60c28284d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "storage_bucket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "allowedMimeTypes" text NOT NULL, "maxFileSize" integer NOT NULL, "authorizationId" uuid, "storageAggregatorId" uuid, CONSTRAINT "REL_f2f48b57269987b13b415a0058" UNIQUE ("authorizationId"), CONSTRAINT "PK_97cd0c3fe7f51e34216822e5f91" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_type_enum" AS ENUM('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'memo', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona')`
    );
    await queryRunner.query(
      `CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "displayName" text NOT NULL, "tagline" text, "description" text, "type" "public"."profile_type_enum" NOT NULL, "authorizationId" uuid, "locationId" uuid, "storageBucketId" uuid, CONSTRAINT "REL_a96475631aba7dce41db03cc8b" UNIQUE ("authorizationId"), CONSTRAINT "REL_432056041df0e4337b17ff7b09" UNIQUE ("locationId"), CONSTRAINT "REL_4a1c74fd2a61b32d9d9500e065" UNIQUE ("storageBucketId"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "reference" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying NOT NULL, "uri" text NOT NULL, "description" text, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_73e8ae665a49366ca7e2866a45" UNIQUE ("authorizationId"), CONSTRAINT "PK_01bacbbdd90839b7dce352e4250" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "vc_interaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "threadID" character varying(44) NOT NULL, "virtualContributorID" uuid NOT NULL, "externalMetadata" text NOT NULL, "roomId" uuid, CONSTRAINT "PK_86198d9af3deb469f6ff10fc649" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "createdBy" uuid NOT NULL, "authorizationId" uuid, "profileId" uuid, "commentsId" uuid, CONSTRAINT "REL_390343b22abec869bf80041933" UNIQUE ("authorizationId"), CONSTRAINT "REL_970844fcd10c2b6df7c1b49eac" UNIQUE ("profileId"), CONSTRAINT "REL_042b9825d770d6b3009ae206c2" UNIQUE ("commentsId"), CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "link" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "uri" text NOT NULL, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_07f249ac87502495710a62c5c0" UNIQUE ("authorizationId"), CONSTRAINT "REL_3bfc8c1aaec1395cc148268d3c" UNIQUE ("profileId"), CONSTRAINT "PK_26206fb7186da72fbb9eaa3fac9" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "memo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "content" bytea, "createdBy" uuid, "contentUpdatePolicy" character varying(128) NOT NULL, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_c3a02e516496db62a676a0bfb7" UNIQUE ("authorizationId"), CONSTRAINT "REL_3eae185405c8e3a7d1828cf863" UNIQUE ("profileId"), CONSTRAINT "PK_612b46ac33a01fda3efb085302d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "callout_contribution" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "createdBy" uuid, "type" character varying(128) NOT NULL DEFAULT 'post', "sortOrder" integer NOT NULL, "authorizationId" uuid, "whiteboardId" uuid, "memoId" uuid, "postId" uuid, "linkId" uuid, "calloutId" uuid, CONSTRAINT "REL_dfa86c46f509a61c6510536cd9" UNIQUE ("authorizationId"), CONSTRAINT "REL_5e34f9a356f6254b8da24f8947" UNIQUE ("whiteboardId"), CONSTRAINT "REL_d1e29afff9bc73a1e20e468e3f" UNIQUE ("memoId"), CONSTRAINT "REL_97fefc97fb254c30577696e1c0" UNIQUE ("postId"), CONSTRAINT "REL_bdf2d0eced5c95968a85caaaae" UNIQUE ("linkId"), CONSTRAINT "PK_134f3f38768fa3d01823391e991" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "whiteboard" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "content" text NOT NULL, "createdBy" uuid, "contentUpdatePolicy" character varying(128) NOT NULL, "previewSettings" json NOT NULL, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_d3b86160bb7d704212382b0ca4" UNIQUE ("authorizationId"), CONSTRAINT "REL_3f9e9e2798d2a4d84b16ee8477" UNIQUE ("profileId"), CONSTRAINT "PK_a699ea2431d3243458dc9350c0a" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "callout_framing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL DEFAULT 'none', "authorizationId" uuid, "profileId" uuid, "whiteboardId" uuid, "linkId" uuid, "memoId" uuid, CONSTRAINT "REL_c9d7c2c4eb8a1d012ddc6605da" UNIQUE ("authorizationId"), CONSTRAINT "REL_f53e2d266432e58e538a366705" UNIQUE ("profileId"), CONSTRAINT "REL_8bc0e1f40be5816d3a593cbf7f" UNIQUE ("whiteboardId"), CONSTRAINT "REL_c3eee1b0c21294874daec15ad5" UNIQUE ("linkId"), CONSTRAINT "REL_7c71c36a3eba63b8b52b30eb25" UNIQUE ("memoId"), CONSTRAINT "PK_9d2f7f4f0fad68294a364bc2071" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "callout_contribution_defaults" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "defaultDisplayName" text, "postDescription" text, "whiteboardContent" text, CONSTRAINT "PK_e849012977f1f9f3b788ca38100" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "callouts_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL, "authorizationId" uuid, "tagsetTemplateSetId" uuid, CONSTRAINT "REL_8f3fd7a83451183166aac4ad02" UNIQUE ("authorizationId"), CONSTRAINT "REL_211515f7e21e93136a6b905e84" UNIQUE ("tagsetTemplateSetId"), CONSTRAINT "PK_ea25b817d864ffa7e41a9254749" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "callout" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "isTemplate" boolean NOT NULL DEFAULT false, "createdBy" uuid, "settings" json NOT NULL, "sortOrder" integer NOT NULL, "publishedBy" uuid, "publishedDate" TIMESTAMP, "authorizationId" uuid, "framingId" uuid, "classificationId" uuid, "contributionDefaultsId" uuid, "commentsId" uuid, "calloutsSetId" uuid, CONSTRAINT "REL_6289dee12effb51320051c6f1f" UNIQUE ("authorizationId"), CONSTRAINT "REL_cf776244b01436d8ca5cc76284" UNIQUE ("framingId"), CONSTRAINT "REL_0674c137336c2417df036053b6" UNIQUE ("classificationId"), CONSTRAINT "REL_36b0da55acff774d0845aeb55f" UNIQUE ("contributionDefaultsId"), CONSTRAINT "REL_62ed316cda7b75735b20307b47" UNIQUE ("commentsId"), CONSTRAINT "PK_b0de4e3682528ac95da8263cfea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "room" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "externalRoomID" character varying NOT NULL, "messagesCount" integer NOT NULL, "type" character varying(128) NOT NULL, "displayName" character varying NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_d1d94dd8e0c417b4188a05ccbc" UNIQUE ("authorizationId"), CONSTRAINT "PK_c6d46db005d623e691b2fbcba23" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "calendar_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "type" character varying(128) NOT NULL, "createdBy" uuid NOT NULL, "startDate" TIMESTAMP NOT NULL, "wholeDay" boolean NOT NULL, "multipleDays" boolean NOT NULL, "durationMinutes" integer NOT NULL, "durationDays" integer, "visibleOnParentCalendar" boolean NOT NULL, "authorizationId" uuid, "profileId" uuid, "commentsId" uuid, "calendarId" uuid, CONSTRAINT "REL_8ee86afa2808a4ab523b9ee6c5" UNIQUE ("authorizationId"), CONSTRAINT "REL_9349e137959f3ca5818c2e62b3" UNIQUE ("profileId"), CONSTRAINT "REL_b5069b11030e9608ee4468f850" UNIQUE ("commentsId"), CONSTRAINT "PK_176fe24e6eb48c3fef696c7641f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "calendar" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_6e74d59afda096b68d12a69969" UNIQUE ("authorizationId"), CONSTRAINT "PK_2492fb846a48ea16d53864e3267" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "timeline" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "calendarId" uuid, CONSTRAINT "REL_5fe58ece01b48496aebc04733d" UNIQUE ("authorizationId"), CONSTRAINT "REL_56aae15a664b2889a1a11c2cf8" UNIQUE ("calendarId"), CONSTRAINT "PK_f841188896cefd9277904ec40b9" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "innovation_flow_state" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "displayName" text NOT NULL, "description" text, "settings" json NOT NULL, "sortOrder" integer NOT NULL, "authorizationId" uuid, "innovationFlowId" uuid, CONSTRAINT "REL_83d9f1d85d3ca51828168ea336" UNIQUE ("authorizationId"), CONSTRAINT "PK_cf4cf4b35e0102b2289afd4f671" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "innovation_flow" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "currentStateID" uuid, "settings" json NOT NULL, "authorizationId" uuid, "profileId" uuid, "flowStatesTagsetTemplateId" uuid, CONSTRAINT "REL_a6e050daa4c7a3ab1e411c3651" UNIQUE ("authorizationId"), CONSTRAINT "REL_96a8cbe1706f459fd7d883be9b" UNIQUE ("profileId"), CONSTRAINT "REL_858fd06a671b804765d91251e6" UNIQUE ("flowStatesTagsetTemplateId"), CONSTRAINT "PK_de1265f614a1c80469975d0aabf" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "license_entitlement" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL, "dataType" character varying(128) NOT NULL, "limit" integer NOT NULL, "enabled" boolean NOT NULL, "licenseId" uuid, CONSTRAINT "PK_7666dbb50926db5ed4b12658684" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "license" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_bfd01743815f0dd68ac1c5c45c" UNIQUE ("authorizationId"), CONSTRAINT "PK_f168ac1ca5ba87286d03b2ef905" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "collaboration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "isTemplate" boolean NOT NULL DEFAULT false, "authorizationId" uuid, "calloutsSetId" uuid, "timelineId" uuid, "innovationFlowId" uuid, "licenseId" uuid, CONSTRAINT "REL_262ecf3f5d70b82a4833618425" UNIQUE ("authorizationId"), CONSTRAINT "REL_9e1ebbc0972fa354d33b67a1a0" UNIQUE ("calloutsSetId"), CONSTRAINT "REL_f67a2d25c945269d602c182fbc" UNIQUE ("timelineId"), CONSTRAINT "REL_35c6b1de6d4d89dfe8e9c85d77" UNIQUE ("innovationFlowId"), CONSTRAINT "REL_aa5815c9577533141cbc4aebe9" UNIQUE ("licenseId"), CONSTRAINT "PK_16651fd53e1fc690513e3346063" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "lifecycle" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "machineState" text, CONSTRAINT "PK_7c4838795fe07c9031abb6762f7" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "organization_verification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "organizationID" character varying(36) NOT NULL, "status" character varying(128) NOT NULL DEFAULT 'not-verified', "authorizationId" uuid, "lifecycleId" uuid, CONSTRAINT "REL_c66eddab0caacb1ef8d46bcafd" UNIQUE ("authorizationId"), CONSTRAINT "REL_1cc3b275fc2a9d9d9b0ae33b31" UNIQUE ("lifecycleId"), CONSTRAINT "PK_0557bbac7f6a2f74fccd0791f82" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "credential" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "resourceID" character varying(36) NOT NULL, "type" character varying(128) NOT NULL, "issuer" uuid, "expires" TIMESTAMP, "agentId" uuid, CONSTRAINT "PK_3a5169bcd3d5463cefeec78be82" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "agent" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "did" character varying(255), "password" character varying(255), "type" character varying(128), "authorizationId" uuid, CONSTRAINT "REL_8ed9d1af584fa62f1ad3405b33" UNIQUE ("authorizationId"), CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying(128) NOT NULL, "credential" json NOT NULL, "parentCredentials" json NOT NULL, "requiresEntryRole" boolean NOT NULL, "requiresSameRoleInParentRoleSet" boolean NOT NULL, "userPolicy" json NOT NULL, "organizationPolicy" json NOT NULL, "virtualContributorPolicy" json NOT NULL, "roleSetId" uuid, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "form" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "questions" text NOT NULL, "description" text NOT NULL, CONSTRAINT "PK_8f72b95aa2f8ba82cf95dc7579e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "platform_invitation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "roleSetInvitedToParent" boolean NOT NULL DEFAULT false, "roleSetExtraRoles" text NOT NULL, "email" character varying(128) NOT NULL, "firstName" character varying(128), "lastName" character varying(128), "createdBy" uuid NOT NULL, "welcomeMessage" character varying(8192), "profileCreated" boolean NOT NULL DEFAULT false, "authorizationId" uuid, "roleSetId" uuid, CONSTRAINT "REL_c0448d2c992a62c9c11bd0f142" UNIQUE ("authorizationId"), CONSTRAINT "PK_66d9303d58aa97cdf0a9a3896f8" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "nvp" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying(512) NOT NULL, "value" character varying(512) NOT NULL, "sortOrder" integer NOT NULL, CONSTRAINT "PK_f5bf73eba4f373433cb9bb75e88" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "communication" json NOT NULL, "privacy" json NOT NULL, "notification" json NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_320cf6b7374f1204df6741bbb0" UNIQUE ("authorizationId"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL, "userID" uuid, "virtualContributorID" uuid, "wellKnownVirtualContributor" character varying(128), "authorizationId" uuid, "conversationsSetId" uuid, "roomId" uuid, CONSTRAINT "REL_a6cdd15ca94945e57a3abbf64d" UNIQUE ("authorizationId"), CONSTRAINT "REL_c3eb45de493217a6d0e225028f" UNIQUE ("roomId"), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "conversations_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_57e3ee47af26b479a67e7f94da" UNIQUE ("authorizationId"), CONSTRAINT "PK_73a366d2f84debeb8b105201494" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "communicationID" character varying NOT NULL, "accountID" uuid NOT NULL, "rowId" SERIAL NOT NULL, "accountUpn" character varying(128) NOT NULL, "firstName" character varying(128) NOT NULL, "lastName" character varying(128) NOT NULL, "email" character varying(512) NOT NULL, "phone" character varying(128), "serviceProfile" boolean NOT NULL, "authorizationId" uuid, "profileId" uuid, "agentId" uuid, "settingsId" uuid, "storageAggregatorId" uuid, "conversationsSetId" uuid, CONSTRAINT "UQ_ad8730bcd46ca67fb2d1edd7565" UNIQUE ("nameID"), CONSTRAINT "UQ_266bc44a18601f893566962df69" UNIQUE ("rowId"), CONSTRAINT "UQ_c09b537a5d76200c622a0fd0b70" UNIQUE ("accountUpn"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "REL_09f909622aa177a097256b7cc2" UNIQUE ("authorizationId"), CONSTRAINT "REL_9466682df91534dd95e4dbaa61" UNIQUE ("profileId"), CONSTRAINT "REL_b61c694cacfab25533bd23d9ad" UNIQUE ("agentId"), CONSTRAINT "REL_390395c3d8592e3e8d8422ce85" UNIQUE ("settingsId"), CONSTRAINT "REL_10458c50c10436b6d589b40e5c" UNIQUE ("storageAggregatorId"), CONSTRAINT "REL_7bb8a970cf4ef09e1f5169a544" UNIQUE ("conversationsSetId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "application" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "lifecycleId" uuid, "userId" uuid, "roleSetId" uuid, CONSTRAINT "REL_56f5614fff0028d40370499582" UNIQUE ("authorizationId"), CONSTRAINT "REL_7ec2857c7d8d16432ffca1cb3d" UNIQUE ("lifecycleId"), CONSTRAINT "PK_569e0c3e863ebdf5f2408ee1670" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "invitation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "invitedContributorID" uuid NOT NULL, "createdBy" uuid NOT NULL, "welcomeMessage" character varying(8192), "invitedToParent" boolean NOT NULL DEFAULT false, "contributorType" character varying(128) NOT NULL, "extraRoles" text NOT NULL, "authorizationId" uuid, "lifecycleId" uuid, "roleSetId" uuid, CONSTRAINT "REL_b132226941570cb650a4023d49" UNIQUE ("authorizationId"), CONSTRAINT "REL_b0c80ccf319a1c7a7af12b3998" UNIQUE ("lifecycleId"), CONSTRAINT "PK_beb994737756c0f18a1c1f8669c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "role_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "entryRoleName" character varying(128) NOT NULL, "type" character varying(128) NOT NULL, "authorizationId" uuid, "licenseId" uuid, "applicationFormId" uuid, "parentRoleSetId" uuid, CONSTRAINT "REL_b038f74c8d4eadb839e78b99ce" UNIQUE ("authorizationId"), CONSTRAINT "REL_c25bfb0c837427dd54e250b240" UNIQUE ("licenseId"), CONSTRAINT "REL_00905b142498f63e76d38fb254" UNIQUE ("applicationFormId"), CONSTRAINT "PK_68be1f1c57124a17e621febc139" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "organization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "communicationID" character varying NOT NULL, "accountID" uuid NOT NULL, "settings" json NOT NULL, "rowId" SERIAL NOT NULL, "legalEntityName" character varying NOT NULL, "domain" character varying NOT NULL, "website" character varying NOT NULL, "contactEmail" character varying NOT NULL, "authorizationId" uuid, "profileId" uuid, "agentId" uuid, "verificationId" uuid, "storageAggregatorId" uuid, "roleSetId" uuid, CONSTRAINT "UQ_d11fdb37a7b736d053b762b27c9" UNIQUE ("nameID"), CONSTRAINT "UQ_9fdd8f0bfe04a676822c7265e17" UNIQUE ("rowId"), CONSTRAINT "REL_e0e150e4f11d906b931b46a2d8" UNIQUE ("authorizationId"), CONSTRAINT "REL_d2cb77c14644156ec8e865608e" UNIQUE ("profileId"), CONSTRAINT "REL_7f1bec8979b57ed7ebd392a2ca" UNIQUE ("agentId"), CONSTRAINT "REL_5a72d5b37312bac2e0a0115718" UNIQUE ("verificationId"), CONSTRAINT "REL_395aa74996a1f978b4969d114b" UNIQUE ("storageAggregatorId"), CONSTRAINT "REL_857684833bbd26eff72f97bcfd" UNIQUE ("roleSetId"), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_group" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "profileId" uuid, "organizationId" uuid, "communityId" uuid, CONSTRAINT "REL_e8e32f1e59c349b406a4752e54" UNIQUE ("authorizationId"), CONSTRAINT "REL_9912e4cfc1e09848a392a65151" UNIQUE ("profileId"), CONSTRAINT "PK_3c29fba6fe013ec8724378ce7c9" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "communication" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "spaceID" character varying(36) NOT NULL, "displayName" character varying NOT NULL, "authorizationId" uuid, "updatesId" uuid, CONSTRAINT "REL_a20c5901817dd09d5906537e08" UNIQUE ("authorizationId"), CONSTRAINT "REL_eb99e588873c788a68a035478a" UNIQUE ("updatesId"), CONSTRAINT "PK_392407b9e9100bee1a64e26cd5d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "community" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "parentID" character varying(36) NOT NULL, "authorizationId" uuid, "communicationId" uuid, "roleSetId" uuid, CONSTRAINT "REL_6e7584bfb417bd0f8e8696ab58" UNIQUE ("authorizationId"), CONSTRAINT "REL_7fbe50fa78a37776ad962cb764" UNIQUE ("communicationId"), CONSTRAINT "REL_3b8f390d76263ef5996869da07" UNIQUE ("roleSetId"), CONSTRAINT "PK_cae794115a383328e8923de4193" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "templates_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_eb0176ef4b98c143322aa6f809" UNIQUE ("authorizationId"), CONSTRAINT "PK_db6605bb92461e7876fd9ec1856" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "community_guidelines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_684b272e6f7459439d41d2879e" UNIQUE ("authorizationId"), CONSTRAINT "REL_3d60fe4fa40d54bad7d51bb4bd" UNIQUE ("profileId"), CONSTRAINT "PK_ffbea98bc7b27d7b72e5f1d2de8" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "space_about" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "why" text, "who" text, "authorizationId" uuid, "profileId" uuid, "guidelinesId" uuid, CONSTRAINT "REL_8ce1fdaa7405b062b0102ce5f1" UNIQUE ("authorizationId"), CONSTRAINT "REL_35584de03c66d9d473cbbe9d37" UNIQUE ("profileId"), CONSTRAINT "REL_830c5cd4eda4b4ba8e297101c7" UNIQUE ("guidelinesId"), CONSTRAINT "PK_1e4422476ffe629a206c0d9c3c6" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "template_content_space" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "rowId" SERIAL NOT NULL, "settings" json NOT NULL, "level" integer NOT NULL, "authorizationId" uuid, "parentSpaceId" uuid, "collaborationId" uuid, "aboutId" uuid, CONSTRAINT "UQ_93791de89f18db45fe1e9bd5e5d" UNIQUE ("rowId"), CONSTRAINT "REL_6c3991ba75f25e07d478a6296d" UNIQUE ("authorizationId"), CONSTRAINT "REL_1101883dd80b6c54f3171979b9" UNIQUE ("collaborationId"), CONSTRAINT "REL_9d01f912e7465553e45a551509" UNIQUE ("aboutId"), CONSTRAINT "PK_140eda2764b73f51493b4ccadc5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "type" character varying(128) NOT NULL, "postDefaultDescription" text, "authorizationId" uuid, "profileId" uuid, "templatesSetId" uuid, "communityGuidelinesId" uuid, "calloutId" uuid, "whiteboardId" uuid, "contentSpaceId" uuid, CONSTRAINT "REL_4318f97beabd362a8a09e9d320" UNIQUE ("authorizationId"), CONSTRAINT "REL_f58c3b144b6e010969e199beef" UNIQUE ("profileId"), CONSTRAINT "REL_eedeae5e63f9a9c3a0161541e9" UNIQUE ("communityGuidelinesId"), CONSTRAINT "REL_c6e4d1a07781a809ad3b3ee826" UNIQUE ("calloutId"), CONSTRAINT "REL_f09090a77e07377eefb3f731d9" UNIQUE ("whiteboardId"), CONSTRAINT "REL_dc4f33c8d24ef7a8af59aafc8b" UNIQUE ("contentSpaceId"), CONSTRAINT "PK_fbae2ac36bd9b5e1e793b957b7f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "template_default" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128) NOT NULL, "allowedTemplateType" character varying(128) NOT NULL, "authorizationId" uuid, "templatesManagerId" uuid, "templateId" uuid, CONSTRAINT "REL_9dbeb9326140b3ce01c1037efe" UNIQUE ("authorizationId"), CONSTRAINT "REL_b6617b64c6ea8ebb24947ddbd4" UNIQUE ("templateId"), CONSTRAINT "PK_bd6d9c154d91399a10665131daa" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "templates_manager" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "templatesSetId" uuid, CONSTRAINT "REL_19ea19263c6016f411fb008243" UNIQUE ("authorizationId"), CONSTRAINT "REL_7ba875eee72ec5fcbe2355124d" UNIQUE ("templatesSetId"), CONSTRAINT "PK_83750198647c82e3586eda4cb37" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "space" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "rowId" SERIAL NOT NULL, "settings" json NOT NULL, "platformRolesAccess" json NOT NULL, "levelZeroSpaceID" uuid, "level" integer NOT NULL, "visibility" character varying(128) NOT NULL, "authorizationId" uuid, "parentSpaceId" uuid, "accountId" uuid, "collaborationId" uuid, "aboutId" uuid, "communityId" uuid, "agentId" uuid, "storageAggregatorId" uuid, "templatesManagerId" uuid, "licenseId" uuid, CONSTRAINT "UQ_0f03c61020ea0dfa0198c60304d" UNIQUE ("rowId"), CONSTRAINT "REL_8d03fd2c8e8411ec9192c79cd9" UNIQUE ("authorizationId"), CONSTRAINT "REL_ea06eb8894469a0f262d929bf0" UNIQUE ("collaborationId"), CONSTRAINT "REL_c59c1beb254808dd32007de661" UNIQUE ("aboutId"), CONSTRAINT "REL_68fa2c2b00cc1ed77e7c225e8b" UNIQUE ("communityId"), CONSTRAINT "REL_9c664d684f987a735678b0ba82" UNIQUE ("agentId"), CONSTRAINT "REL_980c4643d7d9de1b97bc39f518" UNIQUE ("storageAggregatorId"), CONSTRAINT "REL_dea52ce918df6950019678fa35" UNIQUE ("templatesManagerId"), CONSTRAINT "REL_3ef80ef55ba1a1d45e625ea838" UNIQUE ("licenseId"), CONSTRAINT "PK_094f5ec727fe052956a11623640" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_base" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "profileId" uuid, "calloutsSetId" uuid, CONSTRAINT "REL_610fe23f4b0c4d8e38f0d0fbf3" UNIQUE ("authorizationId"), CONSTRAINT "REL_0e8a8e02916c701eeed6bf866a" UNIQUE ("profileId"), CONSTRAINT "REL_970b16bb8c1f8daee6135b00c8" UNIQUE ("calloutsSetId"), CONSTRAINT "PK_19d3f52f6da1501b7e235f1da5c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "virtual_contributor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "communicationID" character varying NOT NULL, "rowId" SERIAL NOT NULL, "settings" json NOT NULL, "platformSettings" json NOT NULL, "aiPersonaID" uuid NOT NULL, "bodyOfKnowledgeID" character varying(128), "promptGraphDefinition" json, "listedInStore" boolean NOT NULL, "searchVisibility" character varying(128) NOT NULL, "dataAccessMode" character varying(128) NOT NULL, "interactionModes" text NOT NULL, "bodyOfKnowledgeType" character varying(128) NOT NULL, "bodyOfKnowledgeDescription" text, "authorizationId" uuid, "profileId" uuid, "agentId" uuid, "accountId" uuid, "knowledgeBaseId" uuid, CONSTRAINT "UQ_d068ef33a6752b8a48839b89d44" UNIQUE ("nameID"), CONSTRAINT "UQ_a643bc875218dd4abbf86bbf7fa" UNIQUE ("rowId"), CONSTRAINT "REL_e2eaa2213ac4454039cd8abc07" UNIQUE ("authorizationId"), CONSTRAINT "REL_4504c37764f6962ccbd165a21d" UNIQUE ("profileId"), CONSTRAINT "REL_a8890dcd65b8c3ee6e160d33f3" UNIQUE ("agentId"), CONSTRAINT "REL_409cc6ee5429588f868cd59a1d" UNIQUE ("knowledgeBaseId"), CONSTRAINT "PK_b81a1ab0eb4d1a0dfeec54faf0b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "innovation_pack" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "listedInStore" boolean NOT NULL, "searchVisibility" character varying(36) NOT NULL DEFAULT 'account', "authorizationId" uuid, "profileId" uuid, "accountId" uuid, "templatesSetId" uuid, CONSTRAINT "REL_8af8122897b05315e7eb892525" UNIQUE ("authorizationId"), CONSTRAINT "REL_5facd6d188068a5a1c5b6f07fc" UNIQUE ("profileId"), CONSTRAINT "REL_a1441e46c8d36090e1f6477cea" UNIQUE ("templatesSetId"), CONSTRAINT "PK_7a2377a54df86416c58289a3efe" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "type" character varying(128), "externalSubscriptionID" character varying(128), "baselineLicensePlan" json NOT NULL, "authorizationId" uuid, "agentId" uuid, "licenseId" uuid, "storageAggregatorId" uuid, CONSTRAINT "REL_91a165c1091a6959cc19d52239" UNIQUE ("authorizationId"), CONSTRAINT "REL_833582df0c439ab8c9adc5240d" UNIQUE ("agentId"), CONSTRAINT "REL_8339e62882f239dc00ff5866f8" UNIQUE ("licenseId"), CONSTRAINT "REL_950221e932175dc7cf7c006488" UNIQUE ("storageAggregatorId"), CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "innovation_hub" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "subdomain" character varying(63) NOT NULL, "type" character varying NOT NULL, "spaceVisibilityFilter" character varying(255), "spaceListFilter" text, "listedInStore" boolean NOT NULL, "searchVisibility" character varying(128) NOT NULL DEFAULT 'account', "authorizationId" uuid, "profileId" uuid, "accountId" uuid, CONSTRAINT "UQ_8f35d04d098bb6c7c57a9a83ac2" UNIQUE ("subdomain"), CONSTRAINT "REL_b411e4f27d77a96eccdabbf4b4" UNIQUE ("authorizationId"), CONSTRAINT "REL_36c8905c2c6c59467c60d94fd8" UNIQUE ("profileId"), CONSTRAINT "PK_763015ae2feecc8aecbc2ec991d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "library" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_3879db652f2421337691219ace" UNIQUE ("authorizationId"), CONSTRAINT "PK_3a61ae2e897d9b5a59a64e91aa4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "activity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "rowId" SERIAL NOT NULL, "triggeredBy" uuid NOT NULL, "resourceID" uuid NOT NULL, "parentID" uuid, "collaborationID" uuid NOT NULL, "messageID" character varying(44), "visibility" boolean NOT NULL, "description" character varying(512), "type" character varying(128) NOT NULL, CONSTRAINT "UQ_07a39cea9426b689be25fd61ded" UNIQUE ("rowId"), CONSTRAINT "PK_24625a1d6b1b089c8ae206fe467" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "forum" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "discussionCategories" text NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_3b0c92945f36d06f37de80285d" UNIQUE ("authorizationId"), CONSTRAINT "PK_ffd925a9b1fa44ab1ce26c9821c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "discussion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "category" text NOT NULL, "createdBy" uuid NOT NULL, "privacy" character varying(255) NOT NULL DEFAULT 'authenticated', "authorizationId" uuid, "profileId" uuid, "commentsId" uuid, "forumId" uuid, CONSTRAINT "REL_4555dccdda9ba57d8e3a634cd0" UNIQUE ("authorizationId"), CONSTRAINT "REL_2d8a3ca181c3f0346817685d21" UNIQUE ("profileId"), CONSTRAINT "REL_5337074c9b818bb63e6f314c80" UNIQUE ("commentsId"), CONSTRAINT "PK_b93169eb129e530c6a4c3b9fda1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "in_app_notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "rowId" SERIAL NOT NULL, "type" character varying(128) NOT NULL, "state" character varying(128) NOT NULL, "category" character varying(128) NOT NULL, "triggeredAt" TIMESTAMP NOT NULL, "triggeredByID" uuid, "receiverID" uuid NOT NULL, "payload" json NOT NULL, "spaceID" uuid, "organizationID" uuid, "userID" uuid, "applicationID" uuid, "invitationID" uuid, "calloutID" uuid, "contributionID" uuid, "roomID" uuid, "messageID" character varying(44), "contributorOrganizationID" uuid, "contributorUserID" uuid, "contributorVcID" uuid, "calendarEventID" uuid, CONSTRAINT "UQ_4c6428607b038a5b96509f8c2e1" UNIQUE ("rowId"), CONSTRAINT "PK_9c57597f8e042ab80df73847de4" PRIMARY KEY ("id")); COMMENT ON COLUMN "in_app_notification"."category" IS 'Which category (role) is this notification targeted to.'; COMMENT ON COLUMN "in_app_notification"."triggeredAt" IS 'UTC'; COMMENT ON COLUMN "in_app_notification"."triggeredByID" IS 'The contributor who triggered the event.'; COMMENT ON COLUMN "in_app_notification"."receiverID" IS 'The contributor who is the receiver of this notification'; COMMENT ON COLUMN "in_app_notification"."payload" IS 'Additional data that is relevant for this Notification.'; COMMENT ON COLUMN "in_app_notification"."spaceID" IS 'FK to Space - cascade deletes notification when space is deleted'; COMMENT ON COLUMN "in_app_notification"."organizationID" IS 'FK to Organization - cascade deletes notification when organization is deleted'; COMMENT ON COLUMN "in_app_notification"."userID" IS 'FK to User - cascade deletes notification when referenced user is deleted'; COMMENT ON COLUMN "in_app_notification"."applicationID" IS 'FK to Application - cascade deletes notification when application is deleted'; COMMENT ON COLUMN "in_app_notification"."invitationID" IS 'FK to Invitation - cascade deletes notification when invitation is deleted'; COMMENT ON COLUMN "in_app_notification"."calloutID" IS 'FK to Callout - cascade deletes notification when callout is deleted'; COMMENT ON COLUMN "in_app_notification"."contributionID" IS 'FK to Callout Contribution - cascade deletes notification when Contribution is deleted'; COMMENT ON COLUMN "in_app_notification"."roomID" IS 'FK to Room - cascade deletes notification when the room is deleted'; COMMENT ON COLUMN "in_app_notification"."messageID" IS 'Not actual FK - used to manually delete notification when the message is deleted'; COMMENT ON COLUMN "in_app_notification"."contributorOrganizationID" IS 'FK to Organization - cascade deletes notification when organization contributor is deleted'; COMMENT ON COLUMN "in_app_notification"."contributorUserID" IS 'FK to User - cascade deletes notification when user contributor is deleted'; COMMENT ON COLUMN "in_app_notification"."contributorVcID" IS 'FK to VC - cascade deletes notification when VC contributor is deleted'; COMMENT ON COLUMN "in_app_notification"."calendarEventID" IS 'FK to Calendar Event - cascade deletes notification when the calendar event is deleted'`
    );
    await queryRunner.query(
      `CREATE TABLE "license_policy" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "credentialRules" json NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_23d4d78ea8db637df031f86f03" UNIQUE ("authorizationId"), CONSTRAINT "PK_ed04907056b7979aeb579ddb77f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "license_plan" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" text NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL, "pricePerMonth" numeric(10,2), "isFree" boolean NOT NULL DEFAULT false, "trialEnabled" boolean NOT NULL DEFAULT false, "requiresPaymentMethod" boolean NOT NULL DEFAULT false, "requiresContactSupport" boolean NOT NULL DEFAULT false, "licenseCredential" text NOT NULL, "type" character varying(128) NOT NULL, "assignToNewOrganizationAccounts" boolean NOT NULL DEFAULT false, "assignToNewUserAccounts" boolean NOT NULL DEFAULT false, "licensingFrameworkId" uuid, CONSTRAINT "PK_634fff4dbc0551f321cbc687725" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "licensing_framework" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, "licensePolicyId" uuid, CONSTRAINT "REL_29b5cd2c555b47f80942dfa4aa" UNIQUE ("authorizationId"), CONSTRAINT "REL_427ff5dfcabbc692ed6d71acae" UNIQUE ("licensePolicyId"), CONSTRAINT "PK_835def882f9474bb983040198ef" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "platform" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "settings" json NOT NULL, "wellKnownVirtualContributors" json NOT NULL, "authorizationId" uuid, "forumId" uuid, "libraryId" uuid, "templatesManagerId" uuid, "storageAggregatorId" uuid, "licensingFrameworkId" uuid, "roleSetId" uuid, CONSTRAINT "REL_9f621c51dd854634d8766a9cfa" UNIQUE ("authorizationId"), CONSTRAINT "REL_dd88d373c64b04e24705d575c9" UNIQUE ("forumId"), CONSTRAINT "REL_ca469f5ec53a7719d155d60aca" UNIQUE ("libraryId"), CONSTRAINT "REL_81f92b22d30540102e9654e892" UNIQUE ("templatesManagerId"), CONSTRAINT "REL_f516dd9a46616999c7e9a6adc1" UNIQUE ("storageAggregatorId"), CONSTRAINT "REL_36d8347a558f81ced8a621fe50" UNIQUE ("licensingFrameworkId"), CONSTRAINT "REL_40f3ebb0c2a0b2a1557e67f849" UNIQUE ("roleSetId"), CONSTRAINT "PK_c33d6abeebd214bd2850bfd6b8e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "ai_persona" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "engine" character varying(128) NOT NULL, "prompt" text NOT NULL, "externalConfig" text, "bodyOfKnowledgeLastUpdated" TIMESTAMP, "promptGraph" json, "authorizationId" uuid, "aiServerId" uuid, CONSTRAINT "REL_293f0d3ef60cb0ca0006044ecf" UNIQUE ("authorizationId"), CONSTRAINT "PK_a6d9eb6a9c43c5d07d358ed2e2a" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "ai_server" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "authorizationId" uuid, CONSTRAINT "REL_9d520fa5fed56042918e48fc4b" UNIQUE ("authorizationId"), CONSTRAINT "PK_4cc0c8ee45be0f83651f174f4c6" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "application_questions" ("applicationId" uuid NOT NULL, "nvpId" uuid NOT NULL, CONSTRAINT "PK_8ad19e3509fc72da4aefa39891f" PRIMARY KEY ("applicationId", "nvpId"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8495fae86f13836b0745642baa" ON "application_questions" ("applicationId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe50118fd82e7fe2f74f986a19" ON "application_questions" ("nvpId") `
    );
    await queryRunner.query(
      `ALTER TABLE "authorization_policy" ADD CONSTRAINT "FK_24b8950effd9ba78caa48ba76df" FOREIGN KEY ("parentAuthorizationPolicyId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset_template" ADD CONSTRAINT "FK_96f23f044acf305c1699e0319d2" FOREIGN KEY ("tagsetTemplateSetId") REFERENCES "tagset_template_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "classification" ADD CONSTRAINT "FK_42422fc4b9dfe4424046f12d8fd" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" ADD CONSTRAINT "FK_eb59b98ee6ef26c993d0d75c83c" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" ADD CONSTRAINT "FK_81fc213b2d9ad0cddeab1a9ce64" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" ADD CONSTRAINT "FK_391d124a58a845b85a047acc9d3" FOREIGN KEY ("classificationId") REFERENCES "classification"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" ADD CONSTRAINT "FK_644155610ddc40dc4e19781c8f0" FOREIGN KEY ("tagsetTemplateId") REFERENCES "tagset_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" ADD CONSTRAINT "FK_4fbd109f9bb84f58b7a3c60649c" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" ADD CONSTRAINT "FK_1104f3ef8497ca40d99b9f46b87" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_d9e2dfcccf59233c17cc6bc6418" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_851e50ec4be7c62a1f9b9a430bf" FOREIGN KEY ("storageBucketId") REFERENCES "storage_bucket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_9fb9257b14ec21daf5bc9aa4c8e" FOREIGN KEY ("tagsetId") REFERENCES "tagset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" ADD CONSTRAINT "FK_f3b4d59c0b805c9c1ecb0070e16" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" ADD CONSTRAINT "FK_b80c28f5335ab5442f63c644d94" FOREIGN KEY ("parentStorageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" ADD CONSTRAINT "FK_0647707288c243e60091c8d8620" FOREIGN KEY ("directStorageId") REFERENCES "storage_bucket"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_bucket" ADD CONSTRAINT "FK_f2f48b57269987b13b415a00587" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_bucket" ADD CONSTRAINT "FK_11d0ed50a26da5513f7e4347847" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_a96475631aba7dce41db03cc8b2" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_432056041df0e4337b17ff7b09d" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_4a1c74fd2a61b32d9d9500e0650" FOREIGN KEY ("storageBucketId") REFERENCES "storage_bucket"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reference" ADD CONSTRAINT "FK_73e8ae665a49366ca7e2866a45d" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reference" ADD CONSTRAINT "FK_2f46c698fc4c19a8cc233c5f255" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "vc_interaction" ADD CONSTRAINT "FK_d6f78c95ff41cdd30e505a4ebbb" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_390343b22abec869bf800419333" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_970844fcd10c2b6df7c1b49eacf" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_042b9825d770d6b3009ae206c2f" FOREIGN KEY ("commentsId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "link" ADD CONSTRAINT "FK_07f249ac87502495710a62c5c01" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "link" ADD CONSTRAINT "FK_3bfc8c1aaec1395cc148268d3cd" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "memo" ADD CONSTRAINT "FK_c3a02e516496db62a676a0bfb74" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "memo" ADD CONSTRAINT "FK_3eae185405c8e3a7d1828cf8639" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_dfa86c46f509a61c6510536cd9a" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_5e34f9a356f6254b8da24f8947b" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboard"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_d1e29afff9bc73a1e20e468e3fd" FOREIGN KEY ("memoId") REFERENCES "memo"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_97fefc97fb254c30577696e1c0a" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_bdf2d0eced5c95968a85caaaaee" FOREIGN KEY ("linkId") REFERENCES "link"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_7370de8eb79ed00b0d403f2299a" FOREIGN KEY ("calloutId") REFERENCES "callout"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD CONSTRAINT "FK_d3b86160bb7d704212382b0ca44" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD CONSTRAINT "FK_3f9e9e2798d2a4d84b16ee8477c" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_c9d7c2c4eb8a1d012ddc6605da9" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_f53e2d266432e58e538a366705d" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_8bc0e1f40be5816d3a593cbf7fa" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboard"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_c3eee1b0c21294874daec15ad59" FOREIGN KEY ("linkId") REFERENCES "link"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_7c71c36a3eba63b8b52b30eb25d" FOREIGN KEY ("memoId") REFERENCES "memo"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callouts_set" ADD CONSTRAINT "FK_8f3fd7a83451183166aac4ad02f" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callouts_set" ADD CONSTRAINT "FK_211515f7e21e93136a6b905e84a" FOREIGN KEY ("tagsetTemplateSetId") REFERENCES "tagset_template_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_6289dee12effb51320051c6f1fc" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_cf776244b01436d8ca5cc762848" FOREIGN KEY ("framingId") REFERENCES "callout_framing"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_0674c137336c2417df036053b65" FOREIGN KEY ("classificationId") REFERENCES "classification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_36b0da55acff774d0845aeb55f2" FOREIGN KEY ("contributionDefaultsId") REFERENCES "callout_contribution_defaults"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_62ed316cda7b75735b20307b47e" FOREIGN KEY ("commentsId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" ADD CONSTRAINT "FK_08d3fa19eb35058446dafa99192" FOREIGN KEY ("calloutsSetId") REFERENCES "callouts_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD CONSTRAINT "FK_d1d94dd8e0c417b4188a05ccbca" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" ADD CONSTRAINT "FK_8ee86afa2808a4ab523b9ee6c5e" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" ADD CONSTRAINT "FK_9349e137959f3ca5818c2e62b3f" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" ADD CONSTRAINT "FK_b5069b11030e9608ee4468f850d" FOREIGN KEY ("commentsId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" ADD CONSTRAINT "FK_80ab7835e1749581a27462eb87f" FOREIGN KEY ("calendarId") REFERENCES "calendar"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar" ADD CONSTRAINT "FK_6e74d59afda096b68d12a699691" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ADD CONSTRAINT "FK_5fe58ece01b48496aebc04733da" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ADD CONSTRAINT "FK_56aae15a664b2889a1a11c2cf82" FOREIGN KEY ("calendarId") REFERENCES "calendar"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow_state" ADD CONSTRAINT "FK_83d9f1d85d3ca51828168ea3367" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow_state" ADD CONSTRAINT "FK_73db98435e680e2a2dada61e815" FOREIGN KEY ("innovationFlowId") REFERENCES "innovation_flow"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" ADD CONSTRAINT "FK_a6e050daa4c7a3ab1e411c36517" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" ADD CONSTRAINT "FK_96a8cbe1706f459fd7d883be9bd" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" ADD CONSTRAINT "FK_858fd06a671b804765d91251e6c" FOREIGN KEY ("flowStatesTagsetTemplateId") REFERENCES "tagset_template"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "license_entitlement" ADD CONSTRAINT "FK_badab780c9f3e196d98ab324686" FOREIGN KEY ("licenseId") REFERENCES "license"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "license" ADD CONSTRAINT "FK_bfd01743815f0dd68ac1c5c45c0" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" ADD CONSTRAINT "FK_262ecf3f5d70b82a48336184251" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" ADD CONSTRAINT "FK_9e1ebbc0972fa354d33b67a1a02" FOREIGN KEY ("calloutsSetId") REFERENCES "callouts_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" ADD CONSTRAINT "FK_f67a2d25c945269d602c182fbc0" FOREIGN KEY ("timelineId") REFERENCES "timeline"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" ADD CONSTRAINT "FK_35c6b1de6d4d89dfe8e9c85d771" FOREIGN KEY ("innovationFlowId") REFERENCES "innovation_flow"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" ADD CONSTRAINT "FK_aa5815c9577533141cbc4aebe9f" FOREIGN KEY ("licenseId") REFERENCES "license"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization_verification" ADD CONSTRAINT "FK_c66eddab0caacb1ef8d46bcafdb" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization_verification" ADD CONSTRAINT "FK_1cc3b275fc2a9d9d9b0ae33b310" FOREIGN KEY ("lifecycleId") REFERENCES "lifecycle"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" ADD CONSTRAINT "FK_dbe0929355f82e5995f0b7fd5e2" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_8ed9d1af584fa62f1ad3405b33b" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD CONSTRAINT "FK_66d695b73839e9b66ff1350d34f" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" ADD CONSTRAINT "FK_c0448d2c992a62c9c11bd0f1422" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" ADD CONSTRAINT "FK_562dce4a08bb214f08107b3631e" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD CONSTRAINT "FK_320cf6b7374f1204df6741bbb0c" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_a6cdd15ca94945e57a3abbf64d1" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_9604668892b53a75690fb92ec25" FOREIGN KEY ("conversationsSetId") REFERENCES "conversations_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_c3eb45de493217a6d0e225028fa" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversations_set" ADD CONSTRAINT "FK_57e3ee47af26b479a67e7f94da0" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_09f909622aa177a097256b7cc22" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_b61c694cacfab25533bd23d9add" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_390395c3d8592e3e8d8422ce853" FOREIGN KEY ("settingsId") REFERENCES "user_settings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_10458c50c10436b6d589b40e5ca" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_7bb8a970cf4ef09e1f5169a5440" FOREIGN KEY ("conversationsSetId") REFERENCES "conversations_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_56f5614fff0028d403704995822" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_7ec2857c7d8d16432ffca1cb3d9" FOREIGN KEY ("lifecycleId") REFERENCES "lifecycle"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_b4ae3fea4a24b4be1a86dacf8a2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_8fb220ad1ac1f9c86ec39d134e4" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_b132226941570cb650a4023d493" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_b0c80ccf319a1c7a7af12b39987" FOREIGN KEY ("lifecycleId") REFERENCES "lifecycle"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_6a3b86c6db10582baae7058f5b9" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" ADD CONSTRAINT "FK_b038f74c8d4eadb839e78b99ce5" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" ADD CONSTRAINT "FK_c25bfb0c837427dd54e250b240e" FOREIGN KEY ("licenseId") REFERENCES "license"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" ADD CONSTRAINT "FK_00905b142498f63e76d38fb254e" FOREIGN KEY ("applicationFormId") REFERENCES "form"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" ADD CONSTRAINT "FK_86acc254af20d20c9d87c3503d5" FOREIGN KEY ("parentRoleSetId") REFERENCES "role_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_e0e150e4f11d906b931b46a2d89" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_d2cb77c14644156ec8e865608e0" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_7f1bec8979b57ed7ebd392a2ca9" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_5a72d5b37312bac2e0a01157185" FOREIGN KEY ("verificationId") REFERENCES "organization_verification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_395aa74996a1f978b4969d114b1" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_857684833bbd26eff72f97bcfdb" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" ADD CONSTRAINT "FK_e8e32f1e59c349b406a4752e545" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" ADD CONSTRAINT "FK_9912e4cfc1e09848a392a651514" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" ADD CONSTRAINT "FK_694ebec955a90e999d9926b7da8" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" ADD CONSTRAINT "FK_9fcc131f256e969d773327f07cb" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_a20c5901817dd09d5906537e087" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_eb99e588873c788a68a035478ab" FOREIGN KEY ("updatesId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "community" ADD CONSTRAINT "FK_6e7584bfb417bd0f8e8696ab585" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "community" ADD CONSTRAINT "FK_7fbe50fa78a37776ad962cb7643" FOREIGN KEY ("communicationId") REFERENCES "communication"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "community" ADD CONSTRAINT "FK_3b8f390d76263ef5996869da071" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_set" ADD CONSTRAINT "FK_eb0176ef4b98c143322aa6f8090" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "community_guidelines" ADD CONSTRAINT "FK_684b272e6f7459439d41d2879ee" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "community_guidelines" ADD CONSTRAINT "FK_3d60fe4fa40d54bad7d51bb4bd1" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" ADD CONSTRAINT "FK_8ce1fdaa7405b062b0102ce5f12" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" ADD CONSTRAINT "FK_35584de03c66d9d473cbbe9d372" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" ADD CONSTRAINT "FK_830c5cd4eda4b4ba8e297101c73" FOREIGN KEY ("guidelinesId") REFERENCES "community_guidelines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" ADD CONSTRAINT "FK_6c3991ba75f25e07d478a6296dd" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" ADD CONSTRAINT "FK_9e2017ee8cfa420bcac748b85db" FOREIGN KEY ("parentSpaceId") REFERENCES "template_content_space"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" ADD CONSTRAINT "FK_1101883dd80b6c54f3171979b99" FOREIGN KEY ("collaborationId") REFERENCES "collaboration"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" ADD CONSTRAINT "FK_9d01f912e7465553e45a551509b" FOREIGN KEY ("aboutId") REFERENCES "space_about"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_4318f97beabd362a8a09e9d3203" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_f58c3b144b6e010969e199beeff" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_c7f54e6269c013d9c273f025edd" FOREIGN KEY ("templatesSetId") REFERENCES "templates_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_eedeae5e63f9a9c3a0161541e98" FOREIGN KEY ("communityGuidelinesId") REFERENCES "community_guidelines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_c6e4d1a07781a809ad3b3ee8265" FOREIGN KEY ("calloutId") REFERENCES "callout"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_f09090a77e07377eefb3f731d9f" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboard"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template" ADD CONSTRAINT "FK_dc4f33c8d24ef7a8af59aafc8b3" FOREIGN KEY ("contentSpaceId") REFERENCES "template_content_space"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" ADD CONSTRAINT "FK_9dbeb9326140b3ce01c1037efee" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" ADD CONSTRAINT "FK_c1135fa45c07ba625e1db9f93bd" FOREIGN KEY ("templatesManagerId") REFERENCES "templates_manager"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" ADD CONSTRAINT "FK_b6617b64c6ea8ebb24947ddbd45" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_manager" ADD CONSTRAINT "FK_19ea19263c6016f411fb0082437" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_manager" ADD CONSTRAINT "FK_7ba875eee72ec5fcbe2355124df" FOREIGN KEY ("templatesSetId") REFERENCES "templates_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_8d03fd2c8e8411ec9192c79cd99" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_ef1ff4ac7f613cc0677e2295b30" FOREIGN KEY ("parentSpaceId") REFERENCES "space"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_6bdeffaf6ea6159b4672a2aed70" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_ea06eb8894469a0f262d929bf06" FOREIGN KEY ("collaborationId") REFERENCES "collaboration"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_c59c1beb254808dd32007de6617" FOREIGN KEY ("aboutId") REFERENCES "space_about"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_68fa2c2b00cc1ed77e7c225e8ba" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_9c664d684f987a735678b0ba825" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_980c4643d7d9de1b97bc39f5185" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_dea52ce918df6950019678fa355" FOREIGN KEY ("templatesManagerId") REFERENCES "templates_manager"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_3ef80ef55ba1a1d45e625ea8389" FOREIGN KEY ("licenseId") REFERENCES "license"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" ADD CONSTRAINT "FK_610fe23f4b0c4d8e38f0d0fbf34" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" ADD CONSTRAINT "FK_0e8a8e02916c701eeed6bf866ad" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" ADD CONSTRAINT "FK_970b16bb8c1f8daee6135b00c82" FOREIGN KEY ("calloutsSetId") REFERENCES "callouts_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_e2eaa2213ac4454039cd8abc07d" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_4504c37764f6962ccbd165a21de" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_a8890dcd65b8c3ee6e160d33f3a" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_7a962c9b04b0d197bc3c93262a7" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_409cc6ee5429588f868cd59a1de" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_base"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" ADD CONSTRAINT "FK_8af8122897b05315e7eb8925253" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" ADD CONSTRAINT "FK_5facd6d188068a5a1c5b6f07fc3" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" ADD CONSTRAINT "FK_51014590f9644e6ff9e0536f40f" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" ADD CONSTRAINT "FK_a1441e46c8d36090e1f6477cea5" FOREIGN KEY ("templatesSetId") REFERENCES "templates_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_91a165c1091a6959cc19d522399" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_833582df0c439ab8c9adc5240d1" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_8339e62882f239dc00ff5866f8c" FOREIGN KEY ("licenseId") REFERENCES "license"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_950221e932175dc7cf7c0064887" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD CONSTRAINT "FK_b411e4f27d77a96eccdabbf4b45" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD CONSTRAINT "FK_36c8905c2c6c59467c60d94fd8a" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD CONSTRAINT "FK_156fd30246eb151b9d17716abf5" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "library" ADD CONSTRAINT "FK_3879db652f2421337691219ace8" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "forum" ADD CONSTRAINT "FK_3b0c92945f36d06f37de80285dd" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" ADD CONSTRAINT "FK_4555dccdda9ba57d8e3a634cd0d" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" ADD CONSTRAINT "FK_2d8a3ca181c3f0346817685d21d" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" ADD CONSTRAINT "FK_5337074c9b818bb63e6f314c808" FOREIGN KEY ("commentsId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" ADD CONSTRAINT "FK_0de78853c1ee793f61bda7eff79" FOREIGN KEY ("forumId") REFERENCES "forum"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_a84dd5170304562dbd58b37521e" FOREIGN KEY ("receiverID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_60085ab32808bc5f628fe3ca587" FOREIGN KEY ("spaceID") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_3a71f82d91a3809bd652cd80f1f" FOREIGN KEY ("organizationID") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_d298041d567d984ed6c0667c814" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_b8fe43c84d0f765bba5f6bd054d" FOREIGN KEY ("applicationID") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_b2f1dc00232220031a6921da1b9" FOREIGN KEY ("invitationID") REFERENCES "invitation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_75c3fa6ba71954e8586bfdbe725" FOREIGN KEY ("calloutID") REFERENCES "callout"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_6df3d947b625cf6bd2ed856f632" FOREIGN KEY ("contributionID") REFERENCES "callout_contribution"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_439dd686c1912533c380b783f0b" FOREIGN KEY ("roomID") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_618449b41643adab8598b80e1b2" FOREIGN KEY ("contributorOrganizationID") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_e4b8c5447b138bd2ce749274ae3" FOREIGN KEY ("contributorUserID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_c9c5d92154e4300bad54b7bbcc7" FOREIGN KEY ("contributorVcID") REFERENCES "virtual_contributor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_8bf8b7bba9aab93abcaa4238820" FOREIGN KEY ("calendarEventID") REFERENCES "calendar_event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "license_policy" ADD CONSTRAINT "FK_23d4d78ea8db637df031f86f030" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "license_plan" ADD CONSTRAINT "FK_9f99adf29316d6aa1d0e8ecae54" FOREIGN KEY ("licensingFrameworkId") REFERENCES "licensing_framework"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "licensing_framework" ADD CONSTRAINT "FK_29b5cd2c555b47f80942dfa4aa7" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "licensing_framework" ADD CONSTRAINT "FK_427ff5dfcabbc692ed6d71acaea" FOREIGN KEY ("licensePolicyId") REFERENCES "license_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_9f621c51dd854634d8766a9cfaf" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_dd88d373c64b04e24705d575c99" FOREIGN KEY ("forumId") REFERENCES "forum"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_ca469f5ec53a7719d155d60aca1" FOREIGN KEY ("libraryId") REFERENCES "library"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_81f92b22d30540102e9654e892c" FOREIGN KEY ("templatesManagerId") REFERENCES "templates_manager"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_f516dd9a46616999c7e9a6adc15" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_36d8347a558f81ced8a621fe509" FOREIGN KEY ("licensingFrameworkId") REFERENCES "licensing_framework"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" ADD CONSTRAINT "FK_40f3ebb0c2a0b2a1557e67f8496" FOREIGN KEY ("roleSetId") REFERENCES "role_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_persona" ADD CONSTRAINT "FK_293f0d3ef60cb0ca0006044ecfd" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_persona" ADD CONSTRAINT "FK_7460caf8dad74c0a302af76b1d5" FOREIGN KEY ("aiServerId") REFERENCES "ai_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_server" ADD CONSTRAINT "FK_9d520fa5fed56042918e48fc4b5" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "application_questions" ADD CONSTRAINT "FK_8495fae86f13836b0745642baa8" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "application_questions" ADD CONSTRAINT "FK_fe50118fd82e7fe2f74f986a195" FOREIGN KEY ("nvpId") REFERENCES "nvp"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "query-result-cache"`);
    await queryRunner.query(
      `ALTER TABLE "application_questions" DROP CONSTRAINT "FK_fe50118fd82e7fe2f74f986a195"`
    );
    await queryRunner.query(
      `ALTER TABLE "application_questions" DROP CONSTRAINT "FK_8495fae86f13836b0745642baa8"`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_server" DROP CONSTRAINT "FK_9d520fa5fed56042918e48fc4b5"`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_persona" DROP CONSTRAINT "FK_7460caf8dad74c0a302af76b1d5"`
    );
    await queryRunner.query(
      `ALTER TABLE "ai_persona" DROP CONSTRAINT "FK_293f0d3ef60cb0ca0006044ecfd"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_40f3ebb0c2a0b2a1557e67f8496"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_36d8347a558f81ced8a621fe509"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_f516dd9a46616999c7e9a6adc15"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_81f92b22d30540102e9654e892c"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_ca469f5ec53a7719d155d60aca1"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_dd88d373c64b04e24705d575c99"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform" DROP CONSTRAINT "FK_9f621c51dd854634d8766a9cfaf"`
    );
    await queryRunner.query(
      `ALTER TABLE "licensing_framework" DROP CONSTRAINT "FK_427ff5dfcabbc692ed6d71acaea"`
    );
    await queryRunner.query(
      `ALTER TABLE "licensing_framework" DROP CONSTRAINT "FK_29b5cd2c555b47f80942dfa4aa7"`
    );
    await queryRunner.query(
      `ALTER TABLE "license_plan" DROP CONSTRAINT "FK_9f99adf29316d6aa1d0e8ecae54"`
    );
    await queryRunner.query(
      `ALTER TABLE "license_policy" DROP CONSTRAINT "FK_23d4d78ea8db637df031f86f030"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_8bf8b7bba9aab93abcaa4238820"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_c9c5d92154e4300bad54b7bbcc7"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_e4b8c5447b138bd2ce749274ae3"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_618449b41643adab8598b80e1b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_439dd686c1912533c380b783f0b"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_6df3d947b625cf6bd2ed856f632"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_75c3fa6ba71954e8586bfdbe725"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_b2f1dc00232220031a6921da1b9"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_b8fe43c84d0f765bba5f6bd054d"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_d298041d567d984ed6c0667c814"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_3a71f82d91a3809bd652cd80f1f"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_60085ab32808bc5f628fe3ca587"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_a84dd5170304562dbd58b37521e"`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" DROP CONSTRAINT "FK_0de78853c1ee793f61bda7eff79"`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" DROP CONSTRAINT "FK_5337074c9b818bb63e6f314c808"`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" DROP CONSTRAINT "FK_2d8a3ca181c3f0346817685d21d"`
    );
    await queryRunner.query(
      `ALTER TABLE "discussion" DROP CONSTRAINT "FK_4555dccdda9ba57d8e3a634cd0d"`
    );
    await queryRunner.query(
      `ALTER TABLE "forum" DROP CONSTRAINT "FK_3b0c92945f36d06f37de80285dd"`
    );
    await queryRunner.query(
      `ALTER TABLE "library" DROP CONSTRAINT "FK_3879db652f2421337691219ace8"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP CONSTRAINT "FK_156fd30246eb151b9d17716abf5"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP CONSTRAINT "FK_36c8905c2c6c59467c60d94fd8a"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP CONSTRAINT "FK_b411e4f27d77a96eccdabbf4b45"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_950221e932175dc7cf7c0064887"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_8339e62882f239dc00ff5866f8c"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_833582df0c439ab8c9adc5240d1"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_91a165c1091a6959cc19d522399"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" DROP CONSTRAINT "FK_a1441e46c8d36090e1f6477cea5"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" DROP CONSTRAINT "FK_51014590f9644e6ff9e0536f40f"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" DROP CONSTRAINT "FK_5facd6d188068a5a1c5b6f07fc3"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" DROP CONSTRAINT "FK_8af8122897b05315e7eb8925253"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_409cc6ee5429588f868cd59a1de"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_7a962c9b04b0d197bc3c93262a7"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_a8890dcd65b8c3ee6e160d33f3a"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_4504c37764f6962ccbd165a21de"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_e2eaa2213ac4454039cd8abc07d"`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" DROP CONSTRAINT "FK_970b16bb8c1f8daee6135b00c82"`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" DROP CONSTRAINT "FK_0e8a8e02916c701eeed6bf866ad"`
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base" DROP CONSTRAINT "FK_610fe23f4b0c4d8e38f0d0fbf34"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_3ef80ef55ba1a1d45e625ea8389"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_dea52ce918df6950019678fa355"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_980c4643d7d9de1b97bc39f5185"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_9c664d684f987a735678b0ba825"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_68fa2c2b00cc1ed77e7c225e8ba"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_c59c1beb254808dd32007de6617"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_ea06eb8894469a0f262d929bf06"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_6bdeffaf6ea6159b4672a2aed70"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_ef1ff4ac7f613cc0677e2295b30"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_8d03fd2c8e8411ec9192c79cd99"`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_manager" DROP CONSTRAINT "FK_7ba875eee72ec5fcbe2355124df"`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_manager" DROP CONSTRAINT "FK_19ea19263c6016f411fb0082437"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" DROP CONSTRAINT "FK_b6617b64c6ea8ebb24947ddbd45"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" DROP CONSTRAINT "FK_c1135fa45c07ba625e1db9f93bd"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_default" DROP CONSTRAINT "FK_9dbeb9326140b3ce01c1037efee"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_dc4f33c8d24ef7a8af59aafc8b3"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_f09090a77e07377eefb3f731d9f"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_c6e4d1a07781a809ad3b3ee8265"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_eedeae5e63f9a9c3a0161541e98"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_c7f54e6269c013d9c273f025edd"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_f58c3b144b6e010969e199beeff"`
    );
    await queryRunner.query(
      `ALTER TABLE "template" DROP CONSTRAINT "FK_4318f97beabd362a8a09e9d3203"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" DROP CONSTRAINT "FK_9d01f912e7465553e45a551509b"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" DROP CONSTRAINT "FK_1101883dd80b6c54f3171979b99"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" DROP CONSTRAINT "FK_9e2017ee8cfa420bcac748b85db"`
    );
    await queryRunner.query(
      `ALTER TABLE "template_content_space" DROP CONSTRAINT "FK_6c3991ba75f25e07d478a6296dd"`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" DROP CONSTRAINT "FK_830c5cd4eda4b4ba8e297101c73"`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" DROP CONSTRAINT "FK_35584de03c66d9d473cbbe9d372"`
    );
    await queryRunner.query(
      `ALTER TABLE "space_about" DROP CONSTRAINT "FK_8ce1fdaa7405b062b0102ce5f12"`
    );
    await queryRunner.query(
      `ALTER TABLE "community_guidelines" DROP CONSTRAINT "FK_3d60fe4fa40d54bad7d51bb4bd1"`
    );
    await queryRunner.query(
      `ALTER TABLE "community_guidelines" DROP CONSTRAINT "FK_684b272e6f7459439d41d2879ee"`
    );
    await queryRunner.query(
      `ALTER TABLE "templates_set" DROP CONSTRAINT "FK_eb0176ef4b98c143322aa6f8090"`
    );
    await queryRunner.query(
      `ALTER TABLE "community" DROP CONSTRAINT "FK_3b8f390d76263ef5996869da071"`
    );
    await queryRunner.query(
      `ALTER TABLE "community" DROP CONSTRAINT "FK_7fbe50fa78a37776ad962cb7643"`
    );
    await queryRunner.query(
      `ALTER TABLE "community" DROP CONSTRAINT "FK_6e7584bfb417bd0f8e8696ab585"`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_eb99e588873c788a68a035478ab"`
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_a20c5901817dd09d5906537e087"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" DROP CONSTRAINT "FK_9fcc131f256e969d773327f07cb"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" DROP CONSTRAINT "FK_694ebec955a90e999d9926b7da8"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" DROP CONSTRAINT "FK_9912e4cfc1e09848a392a651514"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_group" DROP CONSTRAINT "FK_e8e32f1e59c349b406a4752e545"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_857684833bbd26eff72f97bcfdb"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_395aa74996a1f978b4969d114b1"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_5a72d5b37312bac2e0a01157185"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_7f1bec8979b57ed7ebd392a2ca9"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_d2cb77c14644156ec8e865608e0"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_e0e150e4f11d906b931b46a2d89"`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" DROP CONSTRAINT "FK_86acc254af20d20c9d87c3503d5"`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" DROP CONSTRAINT "FK_00905b142498f63e76d38fb254e"`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" DROP CONSTRAINT "FK_c25bfb0c837427dd54e250b240e"`
    );
    await queryRunner.query(
      `ALTER TABLE "role_set" DROP CONSTRAINT "FK_b038f74c8d4eadb839e78b99ce5"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_6a3b86c6db10582baae7058f5b9"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_b0c80ccf319a1c7a7af12b39987"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_b132226941570cb650a4023d493"`
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_8fb220ad1ac1f9c86ec39d134e4"`
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_b4ae3fea4a24b4be1a86dacf8a2"`
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_7ec2857c7d8d16432ffca1cb3d9"`
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_56f5614fff0028d403704995822"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_7bb8a970cf4ef09e1f5169a5440"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_10458c50c10436b6d589b40e5ca"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_390395c3d8592e3e8d8422ce853"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_b61c694cacfab25533bd23d9add"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_9466682df91534dd95e4dbaa616"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_09f909622aa177a097256b7cc22"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversations_set" DROP CONSTRAINT "FK_57e3ee47af26b479a67e7f94da0"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_c3eb45de493217a6d0e225028fa"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_9604668892b53a75690fb92ec25"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_a6cdd15ca94945e57a3abbf64d1"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP CONSTRAINT "FK_320cf6b7374f1204df6741bbb0c"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" DROP CONSTRAINT "FK_562dce4a08bb214f08107b3631e"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" DROP CONSTRAINT "FK_c0448d2c992a62c9c11bd0f1422"`
    );
    await queryRunner.query(
      `ALTER TABLE "role" DROP CONSTRAINT "FK_66d695b73839e9b66ff1350d34f"`
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_8ed9d1af584fa62f1ad3405b33b"`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" DROP CONSTRAINT "FK_dbe0929355f82e5995f0b7fd5e2"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization_verification" DROP CONSTRAINT "FK_1cc3b275fc2a9d9d9b0ae33b310"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization_verification" DROP CONSTRAINT "FK_c66eddab0caacb1ef8d46bcafdb"`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" DROP CONSTRAINT "FK_aa5815c9577533141cbc4aebe9f"`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" DROP CONSTRAINT "FK_35c6b1de6d4d89dfe8e9c85d771"`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" DROP CONSTRAINT "FK_f67a2d25c945269d602c182fbc0"`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" DROP CONSTRAINT "FK_9e1ebbc0972fa354d33b67a1a02"`
    );
    await queryRunner.query(
      `ALTER TABLE "collaboration" DROP CONSTRAINT "FK_262ecf3f5d70b82a48336184251"`
    );
    await queryRunner.query(
      `ALTER TABLE "license" DROP CONSTRAINT "FK_bfd01743815f0dd68ac1c5c45c0"`
    );
    await queryRunner.query(
      `ALTER TABLE "license_entitlement" DROP CONSTRAINT "FK_badab780c9f3e196d98ab324686"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" DROP CONSTRAINT "FK_858fd06a671b804765d91251e6c"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" DROP CONSTRAINT "FK_96a8cbe1706f459fd7d883be9bd"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow" DROP CONSTRAINT "FK_a6e050daa4c7a3ab1e411c36517"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow_state" DROP CONSTRAINT "FK_73db98435e680e2a2dada61e815"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_flow_state" DROP CONSTRAINT "FK_83d9f1d85d3ca51828168ea3367"`
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" DROP CONSTRAINT "FK_56aae15a664b2889a1a11c2cf82"`
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" DROP CONSTRAINT "FK_5fe58ece01b48496aebc04733da"`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar" DROP CONSTRAINT "FK_6e74d59afda096b68d12a699691"`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" DROP CONSTRAINT "FK_80ab7835e1749581a27462eb87f"`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" DROP CONSTRAINT "FK_b5069b11030e9608ee4468f850d"`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" DROP CONSTRAINT "FK_9349e137959f3ca5818c2e62b3f"`
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_event" DROP CONSTRAINT "FK_8ee86afa2808a4ab523b9ee6c5e"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" DROP CONSTRAINT "FK_d1d94dd8e0c417b4188a05ccbca"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_08d3fa19eb35058446dafa99192"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_62ed316cda7b75735b20307b47e"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_36b0da55acff774d0845aeb55f2"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_0674c137336c2417df036053b65"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_cf776244b01436d8ca5cc762848"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout" DROP CONSTRAINT "FK_6289dee12effb51320051c6f1fc"`
    );
    await queryRunner.query(
      `ALTER TABLE "callouts_set" DROP CONSTRAINT "FK_211515f7e21e93136a6b905e84a"`
    );
    await queryRunner.query(
      `ALTER TABLE "callouts_set" DROP CONSTRAINT "FK_8f3fd7a83451183166aac4ad02f"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_7c71c36a3eba63b8b52b30eb25d"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_c3eee1b0c21294874daec15ad59"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_8bc0e1f40be5816d3a593cbf7fa"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_f53e2d266432e58e538a366705d"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_c9d7c2c4eb8a1d012ddc6605da9"`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP CONSTRAINT "FK_3f9e9e2798d2a4d84b16ee8477c"`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP CONSTRAINT "FK_d3b86160bb7d704212382b0ca44"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_7370de8eb79ed00b0d403f2299a"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_bdf2d0eced5c95968a85caaaaee"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_97fefc97fb254c30577696e1c0a"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_d1e29afff9bc73a1e20e468e3fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_5e34f9a356f6254b8da24f8947b"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_dfa86c46f509a61c6510536cd9a"`
    );
    await queryRunner.query(
      `ALTER TABLE "memo" DROP CONSTRAINT "FK_3eae185405c8e3a7d1828cf8639"`
    );
    await queryRunner.query(
      `ALTER TABLE "memo" DROP CONSTRAINT "FK_c3a02e516496db62a676a0bfb74"`
    );
    await queryRunner.query(
      `ALTER TABLE "link" DROP CONSTRAINT "FK_3bfc8c1aaec1395cc148268d3cd"`
    );
    await queryRunner.query(
      `ALTER TABLE "link" DROP CONSTRAINT "FK_07f249ac87502495710a62c5c01"`
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_042b9825d770d6b3009ae206c2f"`
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_970844fcd10c2b6df7c1b49eacf"`
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_390343b22abec869bf800419333"`
    );
    await queryRunner.query(
      `ALTER TABLE "vc_interaction" DROP CONSTRAINT "FK_d6f78c95ff41cdd30e505a4ebbb"`
    );
    await queryRunner.query(
      `ALTER TABLE "reference" DROP CONSTRAINT "FK_2f46c698fc4c19a8cc233c5f255"`
    );
    await queryRunner.query(
      `ALTER TABLE "reference" DROP CONSTRAINT "FK_73e8ae665a49366ca7e2866a45d"`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_4a1c74fd2a61b32d9d9500e0650"`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_432056041df0e4337b17ff7b09d"`
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_a96475631aba7dce41db03cc8b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_bucket" DROP CONSTRAINT "FK_11d0ed50a26da5513f7e4347847"`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_bucket" DROP CONSTRAINT "FK_f2f48b57269987b13b415a00587"`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" DROP CONSTRAINT "FK_0647707288c243e60091c8d8620"`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" DROP CONSTRAINT "FK_b80c28f5335ab5442f63c644d94"`
    );
    await queryRunner.query(
      `ALTER TABLE "storage_aggregator" DROP CONSTRAINT "FK_f3b4d59c0b805c9c1ecb0070e16"`
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_9fb9257b14ec21daf5bc9aa4c8e"`
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_851e50ec4be7c62a1f9b9a430bf"`
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_d9e2dfcccf59233c17cc6bc6418"`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" DROP CONSTRAINT "FK_1104f3ef8497ca40d99b9f46b87"`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" DROP CONSTRAINT "FK_4fbd109f9bb84f58b7a3c60649c"`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" DROP CONSTRAINT "FK_644155610ddc40dc4e19781c8f0"`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" DROP CONSTRAINT "FK_391d124a58a845b85a047acc9d3"`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" DROP CONSTRAINT "FK_81fc213b2d9ad0cddeab1a9ce64"`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset" DROP CONSTRAINT "FK_eb59b98ee6ef26c993d0d75c83c"`
    );
    await queryRunner.query(
      `ALTER TABLE "classification" DROP CONSTRAINT "FK_42422fc4b9dfe4424046f12d8fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "tagset_template" DROP CONSTRAINT "FK_96f23f044acf305c1699e0319d2"`
    );
    await queryRunner.query(
      `ALTER TABLE "authorization_policy" DROP CONSTRAINT "FK_24b8950effd9ba78caa48ba76df"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fe50118fd82e7fe2f74f986a19"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8495fae86f13836b0745642baa"`
    );
    await queryRunner.query(`DROP TABLE "application_questions"`);
    await queryRunner.query(`DROP TABLE "ai_server"`);
    await queryRunner.query(`DROP TABLE "ai_persona"`);
    await queryRunner.query(`DROP TABLE "platform"`);
    await queryRunner.query(`DROP TABLE "licensing_framework"`);
    await queryRunner.query(`DROP TABLE "license_plan"`);
    await queryRunner.query(`DROP TABLE "license_policy"`);
    await queryRunner.query(`DROP TABLE "in_app_notification"`);
    await queryRunner.query(`DROP TABLE "discussion"`);
    await queryRunner.query(`DROP TABLE "forum"`);
    await queryRunner.query(`DROP TABLE "activity"`);
    await queryRunner.query(`DROP TABLE "library"`);
    await queryRunner.query(`DROP TABLE "innovation_hub"`);
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP TABLE "innovation_pack"`);
    await queryRunner.query(`DROP TABLE "virtual_contributor"`);
    await queryRunner.query(`DROP TABLE "knowledge_base"`);
    await queryRunner.query(`DROP TABLE "space"`);
    await queryRunner.query(`DROP TABLE "templates_manager"`);
    await queryRunner.query(`DROP TABLE "template_default"`);
    await queryRunner.query(`DROP TABLE "template"`);
    await queryRunner.query(`DROP TABLE "template_content_space"`);
    await queryRunner.query(`DROP TABLE "space_about"`);
    await queryRunner.query(`DROP TABLE "community_guidelines"`);
    await queryRunner.query(`DROP TABLE "templates_set"`);
    await queryRunner.query(`DROP TABLE "community"`);
    await queryRunner.query(`DROP TABLE "communication"`);
    await queryRunner.query(`DROP TABLE "user_group"`);
    await queryRunner.query(`DROP TABLE "organization"`);
    await queryRunner.query(`DROP TABLE "role_set"`);
    await queryRunner.query(`DROP TABLE "invitation"`);
    await queryRunner.query(`DROP TABLE "application"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "conversations_set"`);
    await queryRunner.query(`DROP TABLE "conversation"`);
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(`DROP TABLE "nvp"`);
    await queryRunner.query(`DROP TABLE "platform_invitation"`);
    await queryRunner.query(`DROP TABLE "form"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TABLE "agent"`);
    await queryRunner.query(`DROP TABLE "credential"`);
    await queryRunner.query(`DROP TABLE "organization_verification"`);
    await queryRunner.query(`DROP TABLE "lifecycle"`);
    await queryRunner.query(`DROP TABLE "collaboration"`);
    await queryRunner.query(`DROP TABLE "license"`);
    await queryRunner.query(`DROP TABLE "license_entitlement"`);
    await queryRunner.query(`DROP TABLE "innovation_flow"`);
    await queryRunner.query(`DROP TABLE "innovation_flow_state"`);
    await queryRunner.query(`DROP TABLE "timeline"`);
    await queryRunner.query(`DROP TABLE "calendar"`);
    await queryRunner.query(`DROP TABLE "calendar_event"`);
    await queryRunner.query(`DROP TABLE "room"`);
    await queryRunner.query(`DROP TABLE "callout"`);
    await queryRunner.query(`DROP TABLE "callouts_set"`);
    await queryRunner.query(`DROP TABLE "callout_contribution_defaults"`);
    await queryRunner.query(`DROP TABLE "callout_framing"`);
    await queryRunner.query(`DROP TABLE "whiteboard"`);
    await queryRunner.query(`DROP TABLE "callout_contribution"`);
    await queryRunner.query(`DROP TABLE "memo"`);
    await queryRunner.query(`DROP TABLE "link"`);
    await queryRunner.query(`DROP TABLE "post"`);
    await queryRunner.query(`DROP TABLE "vc_interaction"`);
    await queryRunner.query(`DROP TABLE "reference"`);
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(`DROP TYPE "public"."profile_type_enum"`);
    await queryRunner.query(`DROP TABLE "storage_bucket"`);
    await queryRunner.query(`DROP TABLE "storage_aggregator"`);
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TABLE "location"`);
    await queryRunner.query(`DROP TABLE "visual"`);
    await queryRunner.query(`DROP TABLE "tagset"`);
    await queryRunner.query(`DROP TABLE "classification"`);
    await queryRunner.query(`DROP TABLE "tagset_template"`);
    await queryRunner.query(`DROP TABLE "tagset_template_set"`);
    await queryRunner.query(`DROP TABLE "authorization_policy"`);
  }
}
