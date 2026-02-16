CREATE TABLE "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"lifecycleId" uuid,
	"userId" uuid,
	"roleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "platform_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"roleSetInvitedToParent" boolean DEFAULT false NOT NULL,
	"roleSetExtraRoles" text NOT NULL,
	"email" varchar(128) NOT NULL,
	"firstName" varchar(128),
	"lastName" varchar(128),
	"createdBy" uuid NOT NULL,
	"welcomeMessage" varchar(8192),
	"profileCreated" boolean DEFAULT false NOT NULL,
	"roleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"invitedContributorID" uuid NOT NULL,
	"createdBy" uuid NOT NULL,
	"welcomeMessage" varchar(8192),
	"invitedToParent" boolean DEFAULT false NOT NULL,
	"contributorType" varchar(128) NOT NULL,
	"extraRoles" text NOT NULL,
	"lifecycleId" uuid,
	"roleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "role_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"entryRoleName" varchar(128) NOT NULL,
	"type" varchar(128) NOT NULL,
	"licenseId" uuid,
	"applicationFormId" uuid,
	"parentRoleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(128) NOT NULL,
	"credential" jsonb NOT NULL,
	"parentCredentials" jsonb NOT NULL,
	"requiresEntryRole" boolean NOT NULL,
	"requiresSameRoleInParentRoleSet" boolean NOT NULL,
	"userPolicy" jsonb NOT NULL,
	"organizationPolicy" jsonb NOT NULL,
	"virtualContributorPolicy" jsonb NOT NULL,
	"roleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"resourceID" varchar(36) NOT NULL,
	"type" varchar(128) NOT NULL,
	"issuer" uuid,
	"expires" timestamp,
	"agentId" uuid
);
--> statement-breakpoint
CREATE TABLE "callout_contribution_defaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"defaultDisplayName" text,
	"postDescription" text,
	"whiteboardContent" text
);
--> statement-breakpoint
CREATE TABLE "callout_contribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"createdBy" uuid,
	"type" varchar(128) DEFAULT 'post' NOT NULL,
	"sortOrder" integer NOT NULL,
	"whiteboardId" uuid,
	"memoId" uuid,
	"postId" uuid,
	"linkId" uuid,
	"calloutId" uuid
);
--> statement-breakpoint
CREATE TABLE "callout_framing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128) DEFAULT 'none' NOT NULL,
	"profileId" uuid,
	"whiteboardId" uuid,
	"linkId" uuid,
	"memoId" uuid,
	"mediaGalleryId" uuid
);
--> statement-breakpoint
CREATE TABLE "callout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"isTemplate" boolean DEFAULT false NOT NULL,
	"createdBy" uuid,
	"settings" jsonb NOT NULL,
	"sortOrder" integer NOT NULL,
	"publishedBy" uuid,
	"publishedDate" timestamp,
	"framingId" uuid,
	"classificationId" uuid,
	"contributionDefaultsId" uuid,
	"commentsId" uuid,
	"calloutsSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "callouts_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128) NOT NULL,
	"tagsetTemplateSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "collaboration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"isTemplate" boolean DEFAULT false NOT NULL,
	"calloutsSetId" uuid,
	"timelineId" uuid,
	"innovationFlowId" uuid,
	"licenseId" uuid
);
--> statement-breakpoint
CREATE TABLE "innovation_flow_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"displayName" text NOT NULL,
	"description" text,
	"settings" jsonb NOT NULL,
	"sortOrder" integer NOT NULL,
	"innovationFlowId" uuid,
	"defaultCalloutTemplateId" uuid
);
--> statement-breakpoint
CREATE TABLE "innovation_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"currentStateID" uuid,
	"settings" jsonb NOT NULL,
	"profileId" uuid,
	"flowStatesTagsetTemplateId" uuid
);
--> statement-breakpoint
CREATE TABLE "link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"uri" text NOT NULL,
	"profileId" uuid
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"createdBy" uuid NOT NULL,
	"commentsId" uuid
);
--> statement-breakpoint
CREATE TABLE "authorization_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"credentialRules" jsonb NOT NULL,
	"privilegeRules" jsonb NOT NULL,
	"type" varchar(128) NOT NULL,
	"parentAuthorizationPolicyId" uuid
);
--> statement-breakpoint
CREATE TABLE "classification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE TABLE "form" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"questions" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"profileId" uuid,
	"calloutsSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "license_entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"type" varchar(128) NOT NULL,
	"dataType" varchar(128) NOT NULL,
	"limit" integer NOT NULL,
	"enabled" boolean NOT NULL,
	"licenseId" uuid
);
--> statement-breakpoint
CREATE TABLE "license" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"machineState" text
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"city" varchar(128),
	"country" varchar(128),
	"addressLine1" varchar(512),
	"addressLine2" varchar(512),
	"stateOrProvince" varchar(128),
	"postalCode" varchar(128),
	"geoLocation" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"createdBy" uuid,
	"storageBucketId" uuid
);
--> statement-breakpoint
CREATE TABLE "memo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"content" "bytea",
	"createdBy" uuid,
	"contentUpdatePolicy" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nvp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(512) NOT NULL,
	"value" varchar(512) NOT NULL,
	"sortOrder" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"displayName" text NOT NULL,
	"tagline" text,
	"description" text,
	"type" varchar(128) NOT NULL,
	"locationId" uuid,
	"storageBucketId" uuid
);
--> statement-breakpoint
CREATE TABLE "reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"name" varchar(255) NOT NULL,
	"uri" text NOT NULL,
	"description" text,
	"profileId" uuid
);
--> statement-breakpoint
CREATE TABLE "tagset_template_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagset_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(128) NOT NULL,
	"allowedValues" text NOT NULL,
	"defaultSelectedValue" varchar(255),
	"tagsetTemplateSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "tagset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"name" varchar(255) DEFAULT 'default' NOT NULL,
	"type" varchar(128) NOT NULL,
	"tags" text NOT NULL,
	"profileId" uuid,
	"classificationId" uuid,
	"tagsetTemplateId" uuid
);
--> statement-breakpoint
CREATE TABLE "visual" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"name" varchar(255) NOT NULL,
	"uri" varchar(2048) NOT NULL,
	"minWidth" integer NOT NULL,
	"maxWidth" integer NOT NULL,
	"minHeight" integer NOT NULL,
	"maxHeight" integer NOT NULL,
	"aspectRatio" numeric(3, 1) NOT NULL,
	"allowedTypes" text NOT NULL,
	"alternativeText" varchar(120),
	"sortOrder" integer,
	"profileId" uuid,
	"mediaGalleryId" uuid
);
--> statement-breakpoint
CREATE TABLE "whiteboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"content" text NOT NULL,
	"createdBy" uuid,
	"contentUpdatePolicy" varchar(128) NOT NULL,
	"previewSettings" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"spaceID" varchar(36) NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"updatesId" uuid
);
--> statement-breakpoint
CREATE TABLE "conversation_membership" (
	"conversationId" uuid NOT NULL,
	"agentId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_membership_conversationId_agentId_pk" PRIMARY KEY("conversationId","agentId")
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"messagingId" uuid,
	"roomId" uuid
);
--> statement-breakpoint
CREATE TABLE "messaging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"messagesCount" integer NOT NULL,
	"type" varchar(128) NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"vcInteractionsByThread" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "community_guidelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"profileId" uuid
);
--> statement-breakpoint
CREATE TABLE "community" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"parentID" varchar(36) NOT NULL,
	"communicationId" uuid,
	"roleSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "organization_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"organizationID" varchar(36) NOT NULL,
	"status" varchar(128) DEFAULT 'not_verified',
	"lifecycleId" uuid
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"agentId" uuid,
	"accountID" uuid NOT NULL,
	"settings" jsonb NOT NULL,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "organization_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"legalEntityName" varchar(255),
	"domain" varchar(255),
	"website" varchar(255),
	"contactEmail" varchar(255),
	"verificationId" uuid,
	"storageAggregatorId" uuid,
	"roleSetId" uuid,
	CONSTRAINT "organization_rowId_unique" UNIQUE("rowId")
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"profileId" uuid,
	"organizationId" uuid,
	"communityId" uuid
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"communication" jsonb NOT NULL,
	"privacy" jsonb NOT NULL,
	"notification" jsonb NOT NULL,
	"homeSpace" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"agentId" uuid,
	"accountID" uuid NOT NULL,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "user_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firstName" varchar(128) NOT NULL,
	"lastName" varchar(128) NOT NULL,
	"email" varchar(512) NOT NULL,
	"phone" varchar(128),
	"authenticationID" uuid,
	"serviceProfile" boolean NOT NULL,
	"settingsId" uuid,
	"storageAggregatorId" uuid,
	CONSTRAINT "user_rowId_unique" UNIQUE("rowId"),
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_authenticationID_unique" UNIQUE("authenticationID")
);
--> statement-breakpoint
CREATE TABLE "virtual_contributor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"agentId" uuid,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "virtual_contributor_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"settings" jsonb NOT NULL,
	"platformSettings" jsonb NOT NULL,
	"aiPersonaID" uuid NOT NULL,
	"bodyOfKnowledgeID" varchar(128),
	"promptGraphDefinition" jsonb,
	"listedInStore" boolean NOT NULL,
	"searchVisibility" varchar(128) NOT NULL,
	"dataAccessMode" varchar(128) NOT NULL,
	"interactionModes" text NOT NULL,
	"bodyOfKnowledgeType" varchar(128) NOT NULL,
	"bodyOfKnowledgeDescription" text,
	"accountId" uuid,
	"knowledgeBaseId" uuid,
	CONSTRAINT "virtual_contributor_rowId_unique" UNIQUE("rowId")
);
--> statement-breakpoint
CREATE TABLE "innovation_hub" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"subdomain" varchar(63) NOT NULL,
	"type" varchar(255) NOT NULL,
	"spaceVisibilityFilter" varchar(255),
	"spaceListFilter" text,
	"listedInStore" boolean NOT NULL,
	"searchVisibility" varchar(128) DEFAULT 'account' NOT NULL,
	"accountId" uuid,
	CONSTRAINT "innovation_hub_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128),
	"externalSubscriptionID" varchar(128),
	"baselineLicensePlan" jsonb NOT NULL,
	"agentId" uuid,
	"licenseId" uuid,
	"storageAggregatorId" uuid
);
--> statement-breakpoint
CREATE TABLE "space_about" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"why" text,
	"who" text,
	"profileId" uuid,
	"guidelinesId" uuid
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "space_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"settings" jsonb NOT NULL,
	"platformRolesAccess" jsonb NOT NULL,
	"levelZeroSpaceID" uuid,
	"level" integer NOT NULL,
	"sortOrder" integer NOT NULL,
	"visibility" varchar(128) NOT NULL,
	"parentSpaceId" uuid,
	"accountId" uuid,
	"collaborationId" uuid,
	"aboutId" uuid,
	"communityId" uuid,
	"agentId" uuid,
	"storageAggregatorId" uuid,
	"templatesManagerId" uuid,
	"licenseId" uuid,
	CONSTRAINT "space_rowId_unique" UNIQUE("rowId")
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"createdBy" uuid,
	"displayName" varchar(512) NOT NULL,
	"mimeType" varchar(128) NOT NULL,
	"size" integer NOT NULL,
	"externalID" varchar(128) NOT NULL,
	"temporaryLocation" boolean DEFAULT false NOT NULL,
	"tagsetId" uuid,
	"storageBucketId" uuid
);
--> statement-breakpoint
CREATE TABLE "storage_aggregator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128),
	"parentStorageAggregatorId" uuid,
	"directStorageId" uuid
);
--> statement-breakpoint
CREATE TABLE "storage_bucket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"allowedMimeTypes" text NOT NULL,
	"maxFileSize" integer NOT NULL,
	"storageAggregatorId" uuid
);
--> statement-breakpoint
CREATE TABLE "template_content_space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "template_content_space_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"settings" jsonb NOT NULL,
	"level" integer NOT NULL,
	"parentSpaceId" uuid,
	"collaborationId" uuid,
	"aboutId" uuid,
	CONSTRAINT "template_content_space_rowId_unique" UNIQUE("rowId")
);
--> statement-breakpoint
CREATE TABLE "template_default" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"type" varchar(128) NOT NULL,
	"allowedTemplateType" varchar(128) NOT NULL,
	"templateId" uuid,
	"templatesManagerId" uuid
);
--> statement-breakpoint
CREATE TABLE "template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"type" varchar(128) NOT NULL,
	"postDefaultDescription" text,
	"communityGuidelinesId" uuid,
	"calloutId" uuid,
	"whiteboardId" uuid,
	"contentSpaceId" uuid,
	"templatesSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "templates_manager" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"templatesSetId" uuid
);
--> statement-breakpoint
CREATE TABLE "templates_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE TABLE "calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"type" varchar(128) NOT NULL,
	"createdBy" uuid NOT NULL,
	"startDate" timestamp NOT NULL,
	"wholeDay" boolean NOT NULL,
	"multipleDays" boolean NOT NULL,
	"durationMinutes" integer NOT NULL,
	"durationDays" integer,
	"visibleOnParentCalendar" boolean NOT NULL,
	"commentsId" uuid,
	"calendarId" uuid
);
--> statement-breakpoint
CREATE TABLE "timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"calendarId" uuid
);
--> statement-breakpoint
CREATE TABLE "innovation_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"accountId" uuid,
	"templatesSetId" uuid,
	"listedInStore" boolean NOT NULL,
	"searchVisibility" varchar(36) DEFAULT 'account' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "activity_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"triggeredBy" uuid NOT NULL,
	"resourceID" uuid NOT NULL,
	"parentID" uuid,
	"collaborationID" uuid NOT NULL,
	"messageID" varchar(44),
	"visibility" boolean NOT NULL,
	"description" varchar(512),
	"type" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"nameID" varchar(36) NOT NULL,
	"profileId" uuid,
	"category" text NOT NULL,
	"commentsId" uuid,
	"createdBy" uuid NOT NULL,
	"forumId" uuid,
	"privacy" varchar(255) DEFAULT 'authenticated' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"discussionCategories" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_app_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"rowId" integer GENERATED ALWAYS AS IDENTITY (sequence name "in_app_notification_rowId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" varchar(128) NOT NULL,
	"state" varchar(128) NOT NULL,
	"category" varchar(128) NOT NULL,
	"triggeredAt" timestamp NOT NULL,
	"triggeredByID" uuid,
	"receiverID" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"spaceID" uuid,
	"organizationID" uuid,
	"userID" uuid,
	"applicationID" uuid,
	"invitationID" uuid,
	"calloutID" uuid,
	"contributionID" uuid,
	"roomID" uuid,
	"messageID" varchar(44),
	"contributorOrganizationID" uuid,
	"contributorUserID" uuid,
	"contributorVcID" uuid,
	"calendarEventID" uuid
);
--> statement-breakpoint
CREATE TABLE "license_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"licensingFrameworkId" uuid,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sortOrder" integer NOT NULL,
	"pricePerMonth" numeric(10, 2),
	"isFree" boolean DEFAULT false NOT NULL,
	"trialEnabled" boolean DEFAULT false NOT NULL,
	"requiresPaymentMethod" boolean DEFAULT false NOT NULL,
	"requiresContactSupport" boolean DEFAULT false NOT NULL,
	"licenseCredential" text NOT NULL,
	"type" varchar(128) NOT NULL,
	"assignToNewOrganizationAccounts" boolean DEFAULT false NOT NULL,
	"assignToNewUserAccounts" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"credentialRules" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licensing_framework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"licensePolicyId" uuid
);
--> statement-breakpoint
CREATE TABLE "platform" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"settings" jsonb NOT NULL,
	"wellKnownVirtualContributors" jsonb NOT NULL,
	"forumId" uuid,
	"libraryId" uuid,
	"templatesManagerId" uuid,
	"storageAggregatorId" uuid,
	"licensingFrameworkId" uuid,
	"roleSetId" uuid,
	"messagingId" uuid
);
--> statement-breakpoint
CREATE TABLE "ai_persona" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid,
	"aiServerId" uuid,
	"engine" varchar(128) NOT NULL,
	"prompt" text NOT NULL,
	"externalConfig" text,
	"bodyOfKnowledgeLastUpdated" timestamp,
	"promptGraph" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_server" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdDate" timestamp DEFAULT now() NOT NULL,
	"updatedDate" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"authorizationId" uuid
);
--> statement-breakpoint
CREATE INDEX "IDX_authorization_policy_type" ON "authorization_policy" USING btree ("type");--> statement-breakpoint
CREATE INDEX "IDX_authorization_policy_parentAuthorizationPolicyId" ON "authorization_policy" USING btree ("parentAuthorizationPolicyId");--> statement-breakpoint
CREATE INDEX "IDX_reference_profileId" ON "reference" USING btree ("profileId");--> statement-breakpoint
CREATE INDEX "IDX_tagset_profileId" ON "tagset" USING btree ("profileId");--> statement-breakpoint
CREATE INDEX "IDX_visual_profileId" ON "visual" USING btree ("profileId");--> statement-breakpoint
CREATE INDEX "IDX_conversation_membership_agentId" ON "conversation_membership" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "IDX_conversation_membership_conversationId" ON "conversation_membership" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "IDX_user_authenticationID" ON "user" USING btree ("authenticationID");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_activity_rowId" ON "activity" USING btree ("rowId");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_in_app_notification_rowId" ON "in_app_notification" USING btree ("rowId");