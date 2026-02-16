import { pgTable, varchar, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const authorizationPolicies = pgTable(
  'authorization_policy',
  {
    ...baseColumns,

    credentialRules: jsonb('credentialRules').notNull(),
    privilegeRules: jsonb('privilegeRules').notNull(),
    type: varchar('type', { length: ENUM_LENGTH }).notNull(),

    // ManyToOne: self-referencing parent authorization policy
    parentAuthorizationPolicyId: uuid('parentAuthorizationPolicyId'),
  },
  (table) => [
    index('IDX_authorization_policy_type').on(table.type),
    index('IDX_authorization_policy_parentAuthorizationPolicyId').on(
      table.parentAuthorizationPolicyId
    ),
  ]
);
