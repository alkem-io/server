import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const spaces = pgTable(
  'space',
  {
    ...authorizableColumns,

    nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
    rowId: integer('rowId').generatedAlwaysAsIdentity().unique(),
    settings: jsonb('settings').notNull(),
    platformRolesAccess: jsonb('platformRolesAccess').notNull(),
    levelZeroSpaceID: uuid('levelZeroSpaceID'),
    level: integer('level').notNull(),
    sortOrder: integer('sortOrder').notNull(),
    visibility: varchar('visibility', { length: ENUM_LENGTH }).notNull(),

    // ManyToOne: self-referencing parentSpace
    parentSpaceId: uuid('parentSpaceId'),

    // ManyToOne: Account
    accountId: uuid('accountId'),

    // OneToOne with @JoinColumn: Collaboration
    collaborationId: uuid('collaborationId'),

    // OneToOne with @JoinColumn: SpaceAbout
    aboutId: uuid('aboutId'),

    // OneToOne with @JoinColumn: Community
    communityId: uuid('communityId'),

    // OneToOne with @JoinColumn: Agent
    agentId: uuid('agentId'),

    // OneToOne with @JoinColumn: StorageAggregator
    storageAggregatorId: uuid('storageAggregatorId'),

    // OneToOne with @JoinColumn: TemplatesManager
    templatesManagerId: uuid('templatesManagerId'),

    // OneToOne with @JoinColumn: License
    licenseId: uuid('licenseId'),
  }
);
