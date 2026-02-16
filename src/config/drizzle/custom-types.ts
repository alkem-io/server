import { customType } from 'drizzle-orm/pg-core';

/**
 * TypeORM simple-array compatibility type.
 * Stores string arrays as comma-separated text in the database.
 *
 * Used by: Tagset.tags, Visual.allowedTypes, StorageBucket.allowedMimeTypes,
 * Invitation.invitedContributors, PlatformInvitation.invitedToParent,
 * InnovationHub.subdomain, Forum.discussionCategories,
 * VirtualContributor.searchVisibility, TagsetTemplate.allowedValues
 */
export const simpleArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'text';
  },
  toDriver(value: string[]): string {
    return value.join(',');
  },
  fromDriver(value: string): string[] {
    return value ? value.split(',') : [];
  },
});

/**
 * TypeORM simple-json compatibility type.
 * Stores arbitrary JSON objects as text (not jsonb) in the database.
 *
 * Used by: AiPersona.prompt, AiPersona.externalConfig
 */
export const simpleJson = <T>() =>
  customType<{
    data: T;
    driverData: string;
  }>({
    dataType() {
      return 'text';
    },
    toDriver(value: T): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string): T {
      return JSON.parse(value) as T;
    },
  });
