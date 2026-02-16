import { relations } from 'drizzle-orm';
import { roleSets } from './role.set.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { roles } from '@domain/access/role/role.schema';
import { applications } from '@domain/access/application/application.schema';
import { invitations } from '@domain/access/invitation/invitation.schema';
import { platformInvitations } from '@domain/access/invitation.platform/platform.invitation.schema';
import { licenses } from '@domain/common/license/license.schema';
import { forms } from '@domain/common/form/form.schema';

export const roleSetsRelations = relations(roleSets, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [roleSets.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: License
  license: one(licenses, {
    fields: [roleSets.licenseId],
    references: [licenses.id],
  }),

  // OneToOne with @JoinColumn: Form (applicationForm)
  applicationForm: one(forms, {
    fields: [roleSets.applicationFormId],
    references: [forms.id],
  }),

  // ManyToOne: self-referencing parentRoleSet
  parentRoleSet: one(roleSets, {
    fields: [roleSets.parentRoleSetId],
    references: [roleSets.id],
    relationName: 'parentChild',
  }),

  // OneToMany: roles
  roles: many(roles),

  // OneToMany: applications
  applications: many(applications),

  // OneToMany: invitations
  invitations: many(invitations),

  // OneToMany: platformInvitations
  platformInvitations: many(platformInvitations),
}));
