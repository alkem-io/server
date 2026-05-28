import { registerEnumType } from '@nestjs/graphql';

/**
 * GraphQL feature-scoped enum exposing the initiator-role values that can appear on
 * a user-email-change audit entry. String values match `PlatformAuditInitiatorRole`
 * for the same members so the projection layer can narrow the cross-category Postgres
 * enum to this enum via a runtime type-guard with no value translation.
 *
 * Both `SELF` and `PLATFORM_ADMIN` are shipped upfront so companion spec 098 (which
 * adds the self-service flow) requires no enum extension.
 */
export enum UserEmailChangeInitiatorRole {
  SELF = 'self',
  PLATFORM_ADMIN = 'platform_admin',
}

registerEnumType(UserEmailChangeInitiatorRole, {
  name: 'UserEmailChangeInitiatorRole',
  description:
    'Role of the actor who initiated a user-email-change audit event.',
});
