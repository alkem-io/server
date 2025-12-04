-- ============================================================================
-- NEW UNIFIED SCHEMA FOR SPEC 019: Entity/Actor/Context Architecture
-- ============================================================================

-- Disable FK checks for creation
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. SUPPORT TABLES (Dependencies for Entity)
-- ============================================================================

CREATE TABLE authorization_policy (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  credentialRules JSON NOT NULL,
  privilegeRules JSON NOT NULL,
  type VARCHAR(128) NOT NULL,
  parentAuthorizationPolicyId CHAR(36) NULL,
  CONSTRAINT FK_auth_policy_parent FOREIGN KEY (parentAuthorizationPolicyId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE location (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  city VARCHAR(128) NULL,
  country VARCHAR(128) NULL,
  addressLine1 VARCHAR(512) NULL,
  addressLine2 VARCHAR(512) NULL,
  stateOrProvince VARCHAR(128) NULL,
  postalCode VARCHAR(128) NULL,
  geoLocation JSON NOT NULL
);

CREATE TABLE storage_aggregator (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NULL,
  authorizationId CHAR(36) NULL,
  parentStorageAggregatorId CHAR(36) NULL,
  directStorageId CHAR(36) NULL,
  CONSTRAINT FK_storage_agg_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_storage_agg_parent FOREIGN KEY (parentStorageAggregatorId) REFERENCES storage_aggregator (id) ON DELETE SET NULL
);

CREATE TABLE storage_bucket (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  allowedMimeTypes TEXT NOT NULL,
  maxFileSize INT NOT NULL,
  authorizationId CHAR(36) NULL,
  storageAggregatorId CHAR(36) NULL,
  CONSTRAINT FK_storage_bucket_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_storage_bucket_agg FOREIGN KEY (storageAggregatorId) REFERENCES storage_aggregator (id) ON DELETE SET NULL
);

-- Circular dependency resolution
ALTER TABLE storage_aggregator ADD CONSTRAINT FK_storage_agg_bucket FOREIGN KEY (directStorageId) REFERENCES storage_bucket (id) ON DELETE SET NULL;

CREATE TABLE profile (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  displayName TEXT NOT NULL,
  tagline TEXT NULL,
  description TEXT NULL,
  authorizationId CHAR(36) NULL,
  locationId CHAR(36) NULL,
  storageBucketId CHAR(36) NULL,
  type VARCHAR(128) NOT NULL,
  CONSTRAINT FK_profile_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_profile_location FOREIGN KEY (locationId) REFERENCES location (id) ON DELETE SET NULL,
  CONSTRAINT FK_profile_bucket FOREIGN KEY (storageBucketId) REFERENCES storage_bucket (id) ON DELETE SET NULL
);

-- ============================================================================
-- 2. CORE ENTITY TABLES
-- ============================================================================

CREATE TABLE entity (
  id CHAR(36) NOT NULL PRIMARY KEY,
  type VARCHAR(128) NOT NULL, -- 'user', 'org', 'vc', 'space', 'account', 'room', 'platform', 'callout', 'whiteboard', 'post', etc.

  -- Common Identity Fields
  display_name TEXT NOT NULL,
  name_id VARCHAR(36) NULL,

  -- Common Metadata
  created_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL DEFAULT 1,
  row_id INT AUTO_INCREMENT UNIQUE,

  -- Common Foreign Keys
  authorization_policy_id CHAR(36) NULL,
  profile_id CHAR(36) NULL,
  storage_aggregator_id CHAR(36) NULL,

  CONSTRAINT UQ_entity_name_id UNIQUE (name_id),
  CONSTRAINT FK_entity_authorization FOREIGN KEY (authorization_policy_id) REFERENCES authorization_policy(id) ON DELETE SET NULL,
  CONSTRAINT FK_entity_profile FOREIGN KEY (profile_id) REFERENCES profile(id) ON DELETE SET NULL,
  CONSTRAINT FK_entity_storage FOREIGN KEY (storage_aggregator_id) REFERENCES storage_aggregator(id) ON DELETE SET NULL,

  INDEX IDX_entity_type (type)
);

CREATE TABLE actor (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  status VARCHAR(128) NOT NULL DEFAULT 'active',
  rate_limit_config JSON NULL,
  CONSTRAINT FK_actor_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
);

CREATE TABLE context (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  parent_context_id CHAR(36) NULL,
  visibility VARCHAR(128) NULL,
  level INT NULL,
  level_zero_space_id CHAR(36) NULL,
  CONSTRAINT FK_context_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_context_parent FOREIGN KEY (parent_context_id) REFERENCES entity(id) ON DELETE SET NULL,
  INDEX IDX_context_parent (parent_context_id)
);

CREATE TABLE entity_credential (
  id CHAR(36) NOT NULL PRIMARY KEY,
  entity_id CHAR(36) NOT NULL,
  resource_id VARCHAR(36) NOT NULL,
  type VARCHAR(128) NOT NULL,
  issuer CHAR(36) NULL,
  expires DATETIME NULL,
  created_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL DEFAULT 1,
  CONSTRAINT FK_credential_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  INDEX IDX_credential_lookup (resource_id, type, entity_id)
);

-- ============================================================================
-- 3. DETAIL TABLES (Refactored from old main tables)
-- ============================================================================

CREATE TABLE user_settings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  communication JSON NOT NULL,
  privacy JSON NOT NULL,
  notification JSON NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_user_settings_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE conversations_set (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_conv_set_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE user_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  email VARCHAR(512) NOT NULL UNIQUE,
  phone VARCHAR(128) NULL,
  authentication_id CHAR(36) NULL UNIQUE,
  service_profile TINYINT NOT NULL DEFAULT 0,
  settings_id CHAR(36) NULL,
  conversations_set_id CHAR(36) NULL,
  CONSTRAINT FK_user_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_user_settings FOREIGN KEY (settings_id) REFERENCES user_settings(id) ON DELETE SET NULL,
  CONSTRAINT FK_user_conversations FOREIGN KEY (conversations_set_id) REFERENCES conversations_set(id) ON DELETE SET NULL
);

CREATE TABLE lifecycle (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  machineState TEXT NULL
);

CREATE TABLE organization_verification (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  organizationID VARCHAR(36) NOT NULL,
  status VARCHAR(128) DEFAULT 'not-verified' NOT NULL,
  authorizationId CHAR(36) NULL,
  lifecycleId CHAR(36) NULL,
  CONSTRAINT FK_org_ver_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_org_ver_lifecycle FOREIGN KEY (lifecycleId) REFERENCES lifecycle (id) ON DELETE SET NULL
);

CREATE TABLE form (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  questions TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE license (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_license_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE role_set (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  entryRoleName VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  applicationFormId CHAR(36) NULL,
  parentRoleSetId CHAR(36) NULL,
  licenseId CHAR(36) NULL,
  type VARCHAR(128) NOT NULL,
  context_entity_id CHAR(36) NULL, -- NEW: Links to Context Entity
  CONSTRAINT FK_role_set_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_role_set_form FOREIGN KEY (applicationFormId) REFERENCES form (id) ON DELETE SET NULL,
  CONSTRAINT FK_role_set_parent FOREIGN KEY (parentRoleSetId) REFERENCES role_set (id) ON DELETE SET NULL,
  CONSTRAINT FK_role_set_license FOREIGN KEY (licenseId) REFERENCES license (id) ON DELETE SET NULL,
  CONSTRAINT FK_role_set_context FOREIGN KEY (context_entity_id) REFERENCES entity (id) ON DELETE SET NULL
);

CREATE TABLE organization_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  legal_entity_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  website VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  verification_id CHAR(36) NULL,
  settings JSON NOT NULL,
  role_set_id CHAR(36) NULL,
  CONSTRAINT FK_org_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_org_verification FOREIGN KEY (verification_id) REFERENCES organization_verification(id) ON DELETE SET NULL,
  CONSTRAINT FK_org_role_set FOREIGN KEY (role_set_id) REFERENCES role_set(id) ON DELETE SET NULL
);

CREATE TABLE knowledge_base (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  calloutsSetId CHAR(36) NULL,
  CONSTRAINT FK_kb_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_kb_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
  -- calloutsSetId FK added later
);

CREATE TABLE virtual_contributor_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  ai_persona_id CHAR(36) NOT NULL,
  settings JSON NOT NULL,
  platform_settings JSON NOT NULL,
  listed_in_store TINYINT NOT NULL DEFAULT 0,
  search_visibility VARCHAR(128) NOT NULL DEFAULT 'account',
  data_access_mode VARCHAR(128) NOT NULL,
  interaction_modes TEXT NOT NULL,
  body_of_knowledge_type VARCHAR(128) NOT NULL,
  body_of_knowledge_id VARCHAR(128) NULL,
  body_of_knowledge_description TEXT NULL,
  prompt_graph_definition JSON NULL,
  knowledge_base_id CHAR(36) NULL,
  CONSTRAINT FK_vc_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_vc_knowledge_base FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_base(id) ON DELETE SET NULL
  -- account_id FK added later (Account is an entity)
);

CREATE TABLE collaboration (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  isTemplate TINYINT DEFAULT 0 NOT NULL,
  authorizationId CHAR(36) NULL,
  timelineId CHAR(36) NULL,
  innovationFlowId CHAR(36) NULL,
  licenseId CHAR(36) NULL,
  calloutsSetId CHAR(36) NULL,
  CONSTRAINT FK_collab_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_collab_license FOREIGN KEY (licenseId) REFERENCES license (id) ON DELETE SET NULL
  -- other FKs added later
);

CREATE TABLE community (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  parentID VARCHAR(36) NOT NULL,
  authorizationId CHAR(36) NULL,
  communicationId CHAR(36) NULL,
  roleSetId CHAR(36) NULL,
  context_entity_id CHAR(36) NULL, -- NEW
  CONSTRAINT FK_community_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_community_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE SET NULL,
  CONSTRAINT FK_community_context FOREIGN KEY (context_entity_id) REFERENCES entity (id) ON DELETE SET NULL
  -- communicationId FK added later
);

CREATE TABLE space_about (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  why TEXT NULL,
  who TEXT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  guidelinesId CHAR(36) NULL,
  CONSTRAINT FK_about_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_about_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
  -- guidelinesId FK added later
);

CREATE TABLE templates_manager (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  templatesSetId CHAR(36) NULL,
  CONSTRAINT FK_tm_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
  -- templatesSetId FK added later
);

CREATE TABLE space_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  settings JSON NOT NULL,
  platform_roles_access JSON NOT NULL,
  collaboration_id CHAR(36) NULL,
  community_id CHAR(36) NULL,
  about_id CHAR(36) NULL,
  templates_manager_id CHAR(36) NULL,
  license_id CHAR(36) NULL,
  CONSTRAINT FK_space_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_space_collaboration FOREIGN KEY (collaboration_id) REFERENCES collaboration(id) ON DELETE SET NULL,
  CONSTRAINT FK_space_community FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE SET NULL,
  CONSTRAINT FK_space_about FOREIGN KEY (about_id) REFERENCES space_about(id) ON DELETE SET NULL,
  CONSTRAINT FK_space_templates FOREIGN KEY (templates_manager_id) REFERENCES templates_manager(id) ON DELETE SET NULL,
  CONSTRAINT FK_space_license FOREIGN KEY (license_id) REFERENCES license(id) ON DELETE SET NULL
  -- account_id FK added later
);

CREATE TABLE account_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  type VARCHAR(128) NULL,
  external_subscription_id VARCHAR(128) NULL,
  baseline_license_plan JSON NOT NULL,
  license_id CHAR(36) NULL,
  CONSTRAINT FK_account_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_account_license FOREIGN KEY (license_id) REFERENCES license(id) ON DELETE SET NULL
);

-- Add Account FKs to other tables
ALTER TABLE user_details ADD CONSTRAINT FK_user_account FOREIGN KEY (account_id) REFERENCES entity(id) ON DELETE CASCADE; -- Account is an entity
ALTER TABLE organization_details ADD CONSTRAINT FK_org_account FOREIGN KEY (account_id) REFERENCES entity(id) ON DELETE CASCADE;
ALTER TABLE virtual_contributor_details ADD CONSTRAINT FK_vc_account FOREIGN KEY (account_id) REFERENCES entity(id) ON DELETE SET NULL;
ALTER TABLE space_details ADD CONSTRAINT FK_space_account FOREIGN KEY (account_id) REFERENCES entity(id) ON DELETE SET NULL;

CREATE TABLE room_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  messages_count INT NOT NULL DEFAULT 0,
  type VARCHAR(128) NOT NULL,
  CONSTRAINT FK_room_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
);

CREATE TABLE callout_framing (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  whiteboardId CHAR(36) NULL,
  type VARCHAR(128) DEFAULT 'none' NOT NULL,
  memoId CHAR(36) NULL,
  linkId CHAR(36) NULL,
  CONSTRAINT FK_framing_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_framing_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
  -- other FKs added later
);

CREATE TABLE callout_contribution_defaults (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  defaultDisplayName TEXT NULL,
  postDescription TEXT NULL,
  whiteboardContent LONGTEXT NULL
);

CREATE TABLE callouts_set (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  tagsetTemplateSetId CHAR(36) NULL,
  CONSTRAINT FK_callouts_set_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
  -- tagsetTemplateSetId FK added later
);

CREATE TABLE classification (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_classification_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE callout_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  is_template TINYINT NOT NULL DEFAULT 0,
  created_by CHAR(36) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published_by CHAR(36) NULL,
  published_date DATETIME NULL,
  framing_id CHAR(36) NULL,
  contribution_defaults_id CHAR(36) NULL,
  comments_id CHAR(36) NULL,
  callouts_set_id CHAR(36) NULL,
  classification_id CHAR(36) NULL,
  settings JSON NOT NULL,
  CONSTRAINT FK_callout_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_callout_framing FOREIGN KEY (framing_id) REFERENCES callout_framing(id) ON DELETE SET NULL,
  CONSTRAINT FK_callout_defaults FOREIGN KEY (contribution_defaults_id) REFERENCES callout_contribution_defaults(id) ON DELETE SET NULL,
  CONSTRAINT FK_callout_comments FOREIGN KEY (comments_id) REFERENCES entity(id) ON DELETE SET NULL, -- Room is an entity
  CONSTRAINT FK_callout_set FOREIGN KEY (callouts_set_id) REFERENCES callouts_set(id) ON DELETE CASCADE,
  CONSTRAINT FK_callout_classification FOREIGN KEY (classification_id) REFERENCES classification(id) ON DELETE SET NULL
);

CREATE TABLE whiteboard_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  content LONGTEXT NOT NULL,
  created_by CHAR(36) NULL,
  content_update_policy VARCHAR(128) NOT NULL,
  preview_settings JSON NOT NULL,
  CONSTRAINT FK_whiteboard_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
);

CREATE TABLE post_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  created_by CHAR(36) NOT NULL,
  comments_id CHAR(36) NULL,
  CONSTRAINT FK_post_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_post_comments FOREIGN KEY (comments_id) REFERENCES entity(id) ON DELETE SET NULL -- Room is an entity
);

-- ============================================================================
-- 4. REMAINING TABLES (Unchanged or Minimally Changed)
-- ============================================================================

CREATE TABLE activity (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  rowId INT AUTO_INCREMENT UNIQUE,
  triggeredBy CHAR(36) NOT NULL, -- entity_id
  resourceID CHAR(36) NOT NULL, -- entity_id
  parentID CHAR(36) NULL,
  collaborationID CHAR(36) NOT NULL,
  messageID CHAR(44) NULL,
  visibility TINYINT NOT NULL,
  description VARCHAR(512) NULL,
  type VARCHAR(128) NOT NULL
);

CREATE TABLE ai_server (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_ai_server_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE ai_persona (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  engine VARCHAR(128) NOT NULL,
  prompt TEXT NOT NULL,
  bodyOfKnowledgeLastUpdated DATETIME NULL,
  externalConfig TEXT NULL,
  authorizationId CHAR(36) NULL,
  aiServerId CHAR(36) NULL,
  promptGraph JSON NULL,
  CONSTRAINT FK_ai_persona_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_ai_persona_server FOREIGN KEY (aiServerId) REFERENCES ai_server (id)
);

CREATE TABLE calendar (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_calendar_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE calendar_event (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  type VARCHAR(128) NOT NULL,
  createdBy CHAR(36) NOT NULL,
  startDate DATETIME NOT NULL,
  wholeDay TINYINT NOT NULL,
  multipleDays TINYINT NOT NULL,
  durationMinutes INT NOT NULL,
  durationDays INT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  commentsId CHAR(36) NULL,
  calendarId CHAR(36) NULL,
  visibleOnParentCalendar TINYINT NOT NULL,
  CONSTRAINT FK_cal_event_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_cal_event_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_cal_event_comments FOREIGN KEY (commentsId) REFERENCES entity (id) ON DELETE SET NULL, -- Room is entity
  CONSTRAINT FK_cal_event_cal FOREIGN KEY (calendarId) REFERENCES calendar (id) ON DELETE CASCADE
);

CREATE TABLE community_guidelines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  CONSTRAINT FK_guidelines_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_guidelines_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
);

-- Update SpaceAbout FK
ALTER TABLE space_about ADD CONSTRAINT FK_about_guidelines FOREIGN KEY (guidelinesId) REFERENCES community_guidelines (id) ON DELETE SET NULL;

CREATE TABLE forum (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  discussionCategories TEXT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_forum_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE discussion (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  category TEXT NOT NULL,
  createdBy CHAR(36) NOT NULL,
  privacy VARCHAR(255) DEFAULT 'authenticated' NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  commentsId CHAR(36) NULL,
  forumId CHAR(36) NULL,
  CONSTRAINT FK_discussion_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_discussion_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_discussion_comments FOREIGN KEY (commentsId) REFERENCES entity (id) ON DELETE SET NULL, -- Room is entity
  CONSTRAINT FK_discussion_forum FOREIGN KEY (forumId) REFERENCES forum (id) ON DELETE CASCADE
);

CREATE TABLE library (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_library_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE license_entitlement (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NOT NULL,
  dataType VARCHAR(128) NOT NULL,
  `limit` INT NOT NULL,
  enabled TINYINT NOT NULL,
  licenseId CHAR(36) NULL,
  CONSTRAINT FK_entitlement_license FOREIGN KEY (licenseId) REFERENCES license (id) ON DELETE CASCADE
);

CREATE TABLE license_policy (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  credentialRules JSON NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_license_policy_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

CREATE TABLE licensing_framework (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  licensePolicyId CHAR(36) NULL,
  CONSTRAINT FK_framework_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_framework_policy FOREIGN KEY (licensePolicyId) REFERENCES license_policy (id) ON DELETE SET NULL
);

CREATE TABLE license_plan (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name TEXT NOT NULL,
  enabled TINYINT DEFAULT 1 NOT NULL,
  sortOrder INT NOT NULL,
  pricePerMonth DECIMAL(10, 2) NULL,
  isFree TINYINT DEFAULT 0 NOT NULL,
  trialEnabled TINYINT DEFAULT 0 NOT NULL,
  requiresPaymentMethod TINYINT DEFAULT 0 NOT NULL,
  requiresContactSupport TINYINT DEFAULT 0 NOT NULL,
  licenseCredential TEXT NOT NULL,
  type VARCHAR(128) NOT NULL,
  assignToNewOrganizationAccounts TINYINT DEFAULT 0 NOT NULL,
  assignToNewUserAccounts TINYINT DEFAULT 0 NOT NULL,
  licensingFrameworkId CHAR(36) NULL,
  CONSTRAINT FK_plan_framework FOREIGN KEY (licensingFrameworkId) REFERENCES licensing_framework (id) ON DELETE CASCADE
);

CREATE TABLE migrations_typeorm (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE nvp (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(512) NOT NULL,
  value VARCHAR(512) NOT NULL,
  sortOrder INT NOT NULL
);

CREATE TABLE `query-result-cache` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NULL,
  time BIGINT NOT NULL,
  duration INT NOT NULL,
  query TEXT NOT NULL,
  result TEXT NOT NULL
);

CREATE TABLE invitation (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  invitedContributorID CHAR(36) NOT NULL,
  createdBy CHAR(36) NOT NULL,
  welcomeMessage VARCHAR(8192) NULL,
  invitedToParent TINYINT DEFAULT 0 NOT NULL,
  contributorType VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  lifecycleId CHAR(36) NULL,
  roleSetId CHAR(36) NULL,
  extraRoles TEXT NOT NULL,
  CONSTRAINT FK_invitation_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_invitation_lifecycle FOREIGN KEY (lifecycleId) REFERENCES lifecycle (id) ON DELETE SET NULL,
  CONSTRAINT FK_invitation_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE CASCADE
);

CREATE TABLE platform_invitation (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  roleSetInvitedToParent TINYINT DEFAULT 0 NOT NULL,
  email VARCHAR(128) NOT NULL,
  firstName VARCHAR(128) NULL,
  lastName VARCHAR(128) NULL,
  createdBy CHAR(36) NOT NULL,
  welcomeMessage VARCHAR(8192) NULL,
  profileCreated TINYINT DEFAULT 0 NOT NULL,
  authorizationId CHAR(36) NULL,
  roleSetId CHAR(36) NULL,
  roleSetExtraRoles TEXT NOT NULL,
  CONSTRAINT FK_plat_inv_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_plat_inv_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE CASCADE
);

CREATE TABLE role (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  credential JSON NOT NULL,
  parentCredentials JSON NOT NULL,
  requiresEntryRole TINYINT NOT NULL,
  requiresSameRoleInParentRoleSet TINYINT NOT NULL,
  actor_policies JSON NOT NULL COMMENT 'Map of entity.type -> {min, max} policy',
  roleSetId CHAR(36) NULL,
  CONSTRAINT FK_role_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE CASCADE
);

CREATE TABLE communication (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  spaceID CHAR(36) NOT NULL COMMENT 'entity_id of the space',
  displayName VARCHAR(255) NOT NULL,
  authorizationId CHAR(36) NULL,
  updatesId CHAR(36) NULL,
  CONSTRAINT FK_comm_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_comm_updates FOREIGN KEY (updatesId) REFERENCES entity (id) ON DELETE SET NULL -- Room is entity
);

-- Update Community FK
ALTER TABLE community ADD CONSTRAINT FK_community_comm FOREIGN KEY (communicationId) REFERENCES communication (id) ON DELETE SET NULL;

CREATE TABLE conversation (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NOT NULL,
  actor_entity_id CHAR(36) NULL COMMENT 'User or VC entity_id',
  wellKnownVirtualContributor VARCHAR(128) NULL,
  authorizationId CHAR(36) NULL,
  conversationsSetId CHAR(36) NULL,
  roomId CHAR(36) NULL,
  CONSTRAINT FK_conv_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_conv_set FOREIGN KEY (conversationsSetId) REFERENCES conversations_set (id) ON DELETE CASCADE,
  CONSTRAINT FK_conv_room FOREIGN KEY (roomId) REFERENCES entity (id) ON DELETE SET NULL, -- Room is entity
  CONSTRAINT FK_conv_actor FOREIGN KEY (actor_entity_id) REFERENCES entity (id) ON DELETE CASCADE
);

CREATE TABLE innovation_hub (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  subdomain VARCHAR(63) NOT NULL,
  type VARCHAR(255) NOT NULL,
  spaceVisibilityFilter VARCHAR(255) NULL,
  spaceListFilter TEXT NULL,
  listedInStore TINYINT NOT NULL,
  searchVisibility VARCHAR(128) DEFAULT 'account' NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  accountId CHAR(36) NULL,
  CONSTRAINT FK_hub_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_hub_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_hub_account FOREIGN KEY (accountId) REFERENCES entity (id) ON DELETE SET NULL -- Account is entity
);

CREATE TABLE link (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  uri TEXT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  CONSTRAINT FK_link_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_link_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
);

CREATE TABLE memo (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  content MEDIUMBLOB NULL,
  createdBy CHAR(36) NULL,
  contentUpdatePolicy VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  CONSTRAINT FK_memo_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_memo_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL
);

-- Update CalloutFraming FKs
ALTER TABLE callout_framing ADD CONSTRAINT FK_framing_whiteboard FOREIGN KEY (whiteboardId) REFERENCES entity (id) ON DELETE SET NULL; -- Whiteboard is entity
ALTER TABLE callout_framing ADD CONSTRAINT FK_framing_memo FOREIGN KEY (memoId) REFERENCES memo (id) ON DELETE SET NULL;
ALTER TABLE callout_framing ADD CONSTRAINT FK_framing_link FOREIGN KEY (linkId) REFERENCES link (id) ON DELETE SET NULL;

CREATE TABLE reference (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  uri TEXT NOT NULL,
  description TEXT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  CONSTRAINT FK_reference_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_reference_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE CASCADE
);

CREATE TABLE tagset_template_set (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL
);

-- Update CalloutsSet FK
ALTER TABLE callouts_set ADD CONSTRAINT FK_callouts_set_template FOREIGN KEY (tagsetTemplateSetId) REFERENCES tagset_template_set (id);

-- Update KnowledgeBase FK
ALTER TABLE knowledge_base ADD CONSTRAINT FK_kb_callouts_set FOREIGN KEY (calloutsSetId) REFERENCES callouts_set (id) ON DELETE SET NULL;

CREATE TABLE tagset_template (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(128) NOT NULL,
  allowedValues TEXT NOT NULL,
  defaultSelectedValue VARCHAR(255) NULL,
  tagsetTemplateSetId CHAR(36) NULL,
  CONSTRAINT FK_tagset_template_set FOREIGN KEY (tagsetTemplateSetId) REFERENCES tagset_template_set (id) ON DELETE CASCADE
);

CREATE TABLE innovation_flow (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  settings JSON NOT NULL,
  flowStatesTagsetTemplateId CHAR(36) NULL,
  currentStateID CHAR(36) NULL,
  CONSTRAINT FK_flow_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_flow_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_flow_template FOREIGN KEY (flowStatesTagsetTemplateId) REFERENCES tagset_template (id) ON DELETE SET NULL
);

CREATE TABLE innovation_flow_state (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  displayName TEXT NOT NULL,
  description TEXT NULL,
  settings JSON NOT NULL,
  sortOrder INT NOT NULL,
  authorizationId CHAR(36) NULL,
  innovationFlowId CHAR(36) NULL,
  CONSTRAINT FK_flow_state_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_flow_state_flow FOREIGN KEY (innovationFlowId) REFERENCES innovation_flow (id) ON DELETE CASCADE
);

CREATE TABLE tagset (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(255) DEFAULT 'default' NOT NULL,
  type VARCHAR(128) NOT NULL,
  tags TEXT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  tagsetTemplateId CHAR(36) NULL,
  classificationId CHAR(36) NULL,
  CONSTRAINT FK_tagset_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_tagset_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE CASCADE,
  CONSTRAINT FK_tagset_template FOREIGN KEY (tagsetTemplateId) REFERENCES tagset_template (id),
  CONSTRAINT FK_tagset_classification FOREIGN KEY (classificationId) REFERENCES classification (id) ON DELETE CASCADE
);

CREATE TABLE document (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  createdBy CHAR(36) NULL,
  displayName VARCHAR(512) NOT NULL,
  mimeType VARCHAR(128) NOT NULL,
  size INT NOT NULL,
  externalID VARCHAR(128) NOT NULL,
  temporaryLocation TINYINT DEFAULT 0 NOT NULL,
  authorizationId CHAR(36) NULL,
  storageBucketId CHAR(36) NULL,
  tagsetId CHAR(36) NULL,
  CONSTRAINT FK_document_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_document_bucket FOREIGN KEY (storageBucketId) REFERENCES storage_bucket (id) ON DELETE CASCADE,
  CONSTRAINT FK_document_tagset FOREIGN KEY (tagsetId) REFERENCES tagset (id) ON DELETE SET NULL
);

CREATE TABLE templates_set (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  CONSTRAINT FK_templates_set_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL
);

-- Update TemplatesManager FK
ALTER TABLE templates_manager ADD CONSTRAINT FK_tm_set FOREIGN KEY (templatesSetId) REFERENCES templates_set (id) ON DELETE SET NULL;

CREATE TABLE innovation_pack (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  listedInStore TINYINT NOT NULL,
  searchVisibility VARCHAR(36) DEFAULT 'account' NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  accountId CHAR(36) NULL,
  templatesSetId CHAR(36) NULL,
  CONSTRAINT FK_pack_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_pack_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_pack_account FOREIGN KEY (accountId) REFERENCES entity (id) ON DELETE CASCADE, -- Account is entity
  CONSTRAINT FK_pack_set FOREIGN KEY (templatesSetId) REFERENCES templates_set (id) ON DELETE SET NULL
);

CREATE TABLE platform_details (
  entity_id CHAR(36) NOT NULL PRIMARY KEY,
  forumId CHAR(36) NULL,
  libraryId CHAR(36) NULL,
  templatesManagerId CHAR(36) NULL,
  storageAggregatorId CHAR(36) NULL,
  licensingFrameworkId CHAR(36) NULL,
  roleSetId CHAR(36) NULL,
  settings JSON NOT NULL,
  wellKnownVirtualContributors JSON NOT NULL,
  CONSTRAINT FK_platform_entity FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_platform_forum FOREIGN KEY (forumId) REFERENCES forum (id) ON DELETE SET NULL,
  CONSTRAINT FK_platform_library FOREIGN KEY (libraryId) REFERENCES library (id) ON DELETE SET NULL,
  CONSTRAINT FK_platform_tm FOREIGN KEY (templatesManagerId) REFERENCES templates_manager (id) ON DELETE SET NULL,
  CONSTRAINT FK_platform_storage FOREIGN KEY (storageAggregatorId) REFERENCES storage_aggregator (id) ON DELETE SET NULL,
  CONSTRAINT FK_platform_framework FOREIGN KEY (licensingFrameworkId) REFERENCES licensing_framework (id) ON DELETE SET NULL,
  CONSTRAINT FK_platform_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE SET NULL
);

CREATE TABLE timeline (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  calendarId CHAR(36) NULL,
  CONSTRAINT FK_timeline_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_timeline_calendar FOREIGN KEY (calendarId) REFERENCES calendar (id) ON DELETE SET NULL
);

-- Update Collaboration FKs
ALTER TABLE collaboration ADD CONSTRAINT FK_collab_timeline FOREIGN KEY (timelineId) REFERENCES timeline (id) ON DELETE SET NULL;
ALTER TABLE collaboration ADD CONSTRAINT FK_collab_flow FOREIGN KEY (innovationFlowId) REFERENCES innovation_flow (id) ON DELETE SET NULL;
ALTER TABLE collaboration ADD CONSTRAINT FK_collab_callouts FOREIGN KEY (calloutsSetId) REFERENCES callouts_set (id) ON DELETE SET NULL;

CREATE TABLE template_content_space (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  rowId INT AUTO_INCREMENT UNIQUE,
  settings JSON NOT NULL,
  level INT NOT NULL,
  authorizationId CHAR(36) NULL,
  collaborationId CHAR(36) NULL,
  aboutId CHAR(36) NULL,
  parentSpaceId CHAR(36) NULL,
  CONSTRAINT FK_tcs_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_tcs_collab FOREIGN KEY (collaborationId) REFERENCES collaboration (id) ON DELETE SET NULL,
  CONSTRAINT FK_tcs_about FOREIGN KEY (aboutId) REFERENCES space_about (id) ON DELETE SET NULL,
  CONSTRAINT FK_tcs_parent FOREIGN KEY (parentSpaceId) REFERENCES template_content_space (id)
);

CREATE TABLE user_group (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  organizationId CHAR(36) NULL,
  communityId CHAR(36) NULL,
  CONSTRAINT FK_group_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_group_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_group_org FOREIGN KEY (organizationId) REFERENCES entity (id) ON DELETE CASCADE, -- Org is entity
  CONSTRAINT FK_group_community FOREIGN KEY (communityId) REFERENCES community (id) ON DELETE CASCADE
);

CREATE TABLE application (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  authorizationId CHAR(36) NULL,
  lifecycleId CHAR(36) NULL,
  userId CHAR(36) NULL,
  roleSetId CHAR(36) NULL,
  CONSTRAINT FK_app_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_app_lifecycle FOREIGN KEY (lifecycleId) REFERENCES lifecycle (id) ON DELETE SET NULL,
  CONSTRAINT FK_app_user FOREIGN KEY (userId) REFERENCES entity (id) ON DELETE CASCADE, -- User is entity
  CONSTRAINT FK_app_roleset FOREIGN KEY (roleSetId) REFERENCES role_set (id) ON DELETE CASCADE
);

CREATE TABLE application_questions (
  applicationId CHAR(36) NOT NULL,
  nvpId CHAR(36) NOT NULL,
  PRIMARY KEY (applicationId, nvpId),
  CONSTRAINT FK_app_q_app FOREIGN KEY (applicationId) REFERENCES application (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT FK_app_q_nvp FOREIGN KEY (nvpId) REFERENCES nvp (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE vc_interaction (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  threadID VARCHAR(44) NOT NULL,
  virtualContributorID CHAR(36) NOT NULL,
  externalMetadata TEXT NOT NULL,
  roomId CHAR(36) NULL,
  CONSTRAINT FK_vc_int_room FOREIGN KEY (roomId) REFERENCES entity (id) ON DELETE CASCADE -- Room is entity
);

CREATE TABLE visual (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  uri VARCHAR(2048) NOT NULL,
  minWidth INT NOT NULL,
  maxWidth INT NOT NULL,
  minHeight INT NOT NULL,
  maxHeight INT NOT NULL,
  aspectRatio DECIMAL(3, 1) NOT NULL,
  allowedTypes TEXT NOT NULL,
  alternativeText VARCHAR(120) NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  CONSTRAINT FK_visual_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_visual_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE CASCADE
);

CREATE TABLE callout_contribution (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  createdBy CHAR(36) NULL,
  sortOrder INT NOT NULL,
  authorizationId CHAR(36) NULL,
  whiteboardId CHAR(36) NULL,
  postId CHAR(36) NULL,
  linkId CHAR(36) NULL,
  calloutId CHAR(36) NULL,
  memoId CHAR(36) NULL,
  type VARCHAR(128) DEFAULT 'post' NOT NULL,
  CONSTRAINT FK_contrib_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_contrib_whiteboard FOREIGN KEY (whiteboardId) REFERENCES entity (id) ON DELETE SET NULL, -- Whiteboard is entity
  CONSTRAINT FK_contrib_post FOREIGN KEY (postId) REFERENCES entity (id) ON DELETE SET NULL, -- Post is entity
  CONSTRAINT FK_contrib_link FOREIGN KEY (linkId) REFERENCES link (id) ON DELETE SET NULL,
  CONSTRAINT FK_contrib_callout FOREIGN KEY (calloutId) REFERENCES entity (id) ON DELETE CASCADE, -- Callout is entity
  CONSTRAINT FK_contrib_memo FOREIGN KEY (memoId) REFERENCES memo (id) ON DELETE SET NULL
);

CREATE TABLE in_app_notification (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  triggeredAt DATETIME NOT NULL,
  type VARCHAR(128) NOT NULL,
  state VARCHAR(128) NOT NULL,
  triggeredByID CHAR(36) NULL,
  category VARCHAR(128) NOT NULL,
  receiverID CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  rowId INT AUTO_INCREMENT UNIQUE,
  spaceID CHAR(36) NULL,
  organizationID CHAR(36) NULL,
  userID CHAR(36) NULL,
  applicationID CHAR(36) NULL,
  invitationID CHAR(36) NULL,
  calloutID CHAR(36) NULL,
  contributionID CHAR(36) NULL,
  roomID CHAR(36) NULL,
  messageID CHAR(44) NULL,
  contributorOrganizationID CHAR(36) NULL,
  contributorUserID CHAR(36) NULL,
  contributorVcID CHAR(36) NULL,
  calendarEventID CHAR(36) NULL,
  context_entity_id CHAR(36) NULL, -- Generic context FK
  target_entity_id CHAR(36) NULL, -- Generic target entity FK
  CONSTRAINT FK_notif_context FOREIGN KEY (context_entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_notif_target FOREIGN KEY (target_entity_id) REFERENCES entity(id) ON DELETE CASCADE,
  CONSTRAINT FK_notif_receiver FOREIGN KEY (receiverID) REFERENCES entity(id) ON DELETE CASCADE -- User is entity
  -- Legacy FKs can be removed or kept for migration safety
);

CREATE TABLE template (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  nameID VARCHAR(36) NOT NULL,
  type VARCHAR(128) NOT NULL,
  postDefaultDescription TEXT NULL,
  authorizationId CHAR(36) NULL,
  profileId CHAR(36) NULL,
  templatesSetId CHAR(36) NULL,
  communityGuidelinesId CHAR(36) NULL,
  calloutId CHAR(36) NULL,
  whiteboardId CHAR(36) NULL,
  contentSpaceId CHAR(36) NULL,
  CONSTRAINT FK_template_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_template_profile FOREIGN KEY (profileId) REFERENCES profile (id) ON DELETE SET NULL,
  CONSTRAINT FK_template_set FOREIGN KEY (templatesSetId) REFERENCES templates_set (id),
  CONSTRAINT FK_template_guidelines FOREIGN KEY (communityGuidelinesId) REFERENCES community_guidelines (id) ON DELETE SET NULL,
  CONSTRAINT FK_template_callout FOREIGN KEY (calloutId) REFERENCES entity (id) ON DELETE SET NULL, -- Callout is entity
  CONSTRAINT FK_template_whiteboard FOREIGN KEY (whiteboardId) REFERENCES entity (id) ON DELETE SET NULL, -- Whiteboard is entity
  CONSTRAINT FK_template_content FOREIGN KEY (contentSpaceId) REFERENCES template_content_space (id) ON DELETE SET NULL
);

CREATE TABLE template_default (
  id CHAR(36) NOT NULL PRIMARY KEY,
  createdDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
  updatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL ON UPDATE CURRENT_TIMESTAMP(6),
  version INT NOT NULL,
  type VARCHAR(128) NOT NULL,
  allowedTemplateType VARCHAR(128) NOT NULL,
  authorizationId CHAR(36) NULL,
  templatesManagerId CHAR(36) NULL,
  templateId CHAR(36) NULL,
  CONSTRAINT FK_td_auth FOREIGN KEY (authorizationId) REFERENCES authorization_policy (id) ON DELETE SET NULL,
  CONSTRAINT FK_td_tm FOREIGN KEY (templatesManagerId) REFERENCES templates_manager (id),
  CONSTRAINT FK_td_template FOREIGN KEY (templateId) REFERENCES template (id) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;
