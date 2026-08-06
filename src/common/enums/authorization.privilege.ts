import { registerEnumType } from '@nestjs/graphql';

export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
  PLATFORM_ROLES_ASSIGN = 'platform-roles-assign',
  AUTHORIZATION_RESET = 'authorization-reset',
  LICENSE_RESET = 'license-reset',
  PLATFORM_OPERATIONS_ADMIN = 'platform-operations-admin', // gates the operational & maintenance mutation family
  PLATFORM_SETTINGS_ADMIN = 'platform-settings-admin', // To determine if the user should be able to update platform wide settings
  CONTRIBUTE = 'contribute',
  CREATE_CALLOUT = 'create-callout',
  CREATE_POST = 'create-post',
  CREATE_DISCUSSION = 'create-discussion',
  CREATE_MESSAGE = 'create-message',
  CREATE_MESSAGE_REPLY = 'create-message-reply',
  CREATE_MESSAGE_REACTION = 'create-message-reaction',
  CREATE_WHITEBOARD = 'create-whiteboard',
  CREATE_SPACE = 'create-space',
  CREATE_SUBSPACE = 'create-subspace',
  CREATE_ORGANIZATION = 'create-organization',
  CREATE_VIRTUAL = 'create-virtual-contributor',
  CREATE_INNOVATION_PACK = 'create-innovation-pack',
  CREATE_INNOVATION_HUB = 'create-innovation-hub',
  FILE_UPLOAD = 'file-upload',
  FILE_DELETE = 'file-delete',
  UPDATE_INNOVATION_FLOW = 'update-innovation-flow',
  ROLESET_ENTRY_ROLE_JOIN = 'roleset-entry-role-join',
  ROLESET_ENTRY_ROLE_APPLY = 'roleset-entry-role-apply',
  ROLESET_ENTRY_ROLE_INVITE = 'roleset-entry-role-invite',
  ROLESET_ENTRY_ROLE_INVITE_ACCEPT = 'roleset-entry-role-invite-accept',
  ROLESET_ENTRY_ROLE_ASSIGN = 'roleset-entry-role-assign', // only for global admins
  ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION = 'roleset-entry-role-assign-organization', // only for global admins
  COMMUNITY_ASSIGN_VC_FROM_ACCOUNT = 'community-assign-vc-from-account', // allow adding a VC as member to a community from an account
  UPDATE_CALLOUT_PUBLISHER = 'update-callout-publisher',
  READ_ABOUT = 'read-about', // access the external about information for an entity
  READ_LICENSE = 'read-license', // access the licensing information for an entity
  READ_USERS = 'read-users',
  READ_USER_PII = 'read-user-pii',
  READ_USER_SETTINGS = 'read-user-settings',
  MOVE_POST = 'move-post',
  MOVE_CONTRIBUTION = 'move-contribution',
  ACCESS_INTERACTIVE_GUIDANCE = 'access-interactive-guidance',
  ACCESS_VIRTUAL_ASSISTANT = 'access-virtual-assistant', // may the user use the web AI assistant (004-web-ai-assistant, FR-027)
  UPDATE_CONTENT = 'update-content',
  RECEIVE_NOTIFICATIONS = 'receive-notifications',
  RECEIVE_NOTIFICATIONS_ADMIN = 'receive-notifications-admin',
  RECEIVE_NOTIFICATIONS_ORGANIZATION_ADMIN = 'receive-notifications-organization-admin',
  RECEIVE_NOTIFICATIONS_SPACE_ADMIN = 'receive-notifications-space-admin',
  RECEIVE_NOTIFICATIONS_SPACE_LEAD = 'receive-notifications-space-lead',
  TRANSFER_RESOURCE_OFFER = 'transfer-resource-offer',
  TRANSFER_RESOURCE_ACCEPT = 'transfer-resource-accept',
  ACCOUNT_LICENSE_MANAGE = 'account-license-manage',
  PUBLIC_SHARE = 'public-share', // Allow sharing whiteboard content publicly for guest contributions

  // --- 027-platform-role-redesign: eleven new privileges (Slice A, additive) ---
  FEATURE_ROLE_ASSIGN = 'feature-role-assign', // low-risk Feature-role assignment (Users Admin + Roles Admin)
  PLATFORM_CONTENT_FULL_ACCESS = 'platform-content-full-access', // controlled replacement for the root CRUD cascade — read + this privilege only
  PLATFORM_USERS_ADMIN = 'platform-users-admin', // user-record family: email change, identity/account delete, PII read
  PLATFORM_SUPPORT_ORG_RESOURCES = 'platform-support-org-resources', // A7 — org-owned packs/hubs update + full template CRUD
  PLATFORM_FORUM_MANAGE = 'platform-forum-manage', // A15 — the platform forum, off the GLOBAL_SUPPORT cascade
  DELETE_ORGANIZATION = 'delete-organization', // A6 — organization deletion, off plain DELETE
  PLATFORM_AUDIT_READ = 'platform-audit-read', // A19 — read the platform audit trail (PII-masked)
  PLATFORM_ROLE_HOLDERS_READ = 'platform-role-holders-read', // A20 — read `Platform …` holder lists
  FEATURE_ROLE_HOLDERS_READ = 'feature-role-holders-read', // A20b — read `Feature …` holder lists
  SET_SERVICE_PROFILE = 'set-service-profile', // A21 — extracted from the ordinary user update
  UPDATE_NAMEID = 'update-nameid', // A17 — protected "dangerous update"; deferred to Slice B (T078)
}

registerEnumType(AuthorizationPrivilege, {
  name: 'AuthorizationPrivilege',
});
