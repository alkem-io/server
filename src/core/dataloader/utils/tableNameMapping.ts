/**
 * Maps TypeORM entity class names to Drizzle table names.
 * This is used by DataLoader creators to find the correct Drizzle table.
 */
export const ENTITY_TO_TABLE_NAME: Record<string, string> = {
  // Community
  User: 'users',
  Organization: 'organizations',
  VirtualContributor: 'virtualContributors',
  Community: 'communities',
  CommunityGuidelines: 'communityGuidelines',
  UserGroup: 'userGroups',
  UserSettings: 'userSettings',
  OrganizationVerification: 'organizationVerifications',

  // Common
  Profile: 'profiles',
  Visual: 'visuals',
  License: 'licenses',
  LicenseEntitlement: 'licenseEntitlements',
  Authorization: 'authorizationPolicies',
  Reference: 'references',
  Tagset: 'tagsets',
  TagsetTemplate: 'tagsetTemplates',
  TagsetTemplateSet: 'tagsetTemplateSets',
  Location: 'locations',
  Form: 'forms',
  Lifecycle: 'lifecycles',
  NVP: 'nvps',
  Whiteboard: 'whiteboards',
  Classification: 'classifications',
  Memo: 'memos',
  MediaGallery: 'mediaGalleries',
  KnowledgeBase: 'knowledgeBases',

  // Agent
  Agent: 'agents',
  Credential: 'credentials',

  // Space
  Space: 'spaces',
  Account: 'accounts',
  SpaceAbout: 'spaceAbouts',

  // Collaboration
  Collaboration: 'collaborations',
  InnovationFlow: 'innovationFlows',
  InnovationFlowState: 'innovationFlowStates',
  Callout: 'callouts',
  CalloutFraming: 'calloutFramings',
  CalloutContribution: 'calloutContributions',
  CalloutContributionDefaults: 'calloutContributionDefaults',
  CalloutsSet: 'calloutsSets',
  Post: 'posts',
  Link: 'links',

  // Communication
  Communication: 'communications',
  Messaging: 'messagings',
  ConversationMembership: 'conversationMemberships',

  // Timeline
  Calendar: 'calendars',
  Timeline: 'timelines',
  CalendarEvent: 'calendarEvents',

  // Access
  Role: 'roles',
  RoleSet: 'roleSets',
  Invitation: 'invitations',
  PlatformInvitation: 'platformInvitations',
  Application: 'applications',

  // Innovation Hub
  InnovationHub: 'innovationHubs',

  // Storage
  StorageAggregator: 'storageAggregators',
  StorageBucket: 'storageBuckets',
  Document: 'documents',

  // Template
  TemplateContentSpace: 'templateContentSpaces',
  TemplatesSet: 'templatesSets',

  // Communication additional
  Conversation: 'conversations',
  Room: 'rooms',
};

export function getTableName(entityName: string): string {
  const tableName = ENTITY_TO_TABLE_NAME[entityName];
  if (!tableName) {
    throw new Error(
      `No table mapping found for entity ${entityName}. Please add it to ENTITY_TO_TABLE_NAME in tableNameMapping.ts`
    );
  }
  return tableName;
}
