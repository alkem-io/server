import { AuthorizationCredential } from '@common/enums';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

/**
 * The platform credentials that may read a DRAFT Post wherever the Post is
 * reachable, used by the draft-Post read rule. The Form response access owner
 * no longer builds on it: its read-all audience mirrors the space-admin rule
 * (role set ADMIN plus `platformRolesAccess` UPDATE holders, server#6621).
 *
 * 027-platform-role-redesign (T076, Slice B): empty. The two legacy global
 * credentials are gone; platform-wide read of a draft Post arrives through the
 * root content rule and, per space, through `platformRolesAccess` — no
 * hardcoded global reader.
 */
export const getDraftCalloutPlatformReadCredentials =
  (): ICredentialDefinition[] => [];

/**
 * The platform credential types that may change who publishes a Post
 * (UPDATE_CALLOUT_PUBLISHER). Kept next to the draft read list so every
 * platform credential of a callout rule lives in one place.
 *
 * 027-platform-role-redesign (T038, A8; legacy reachers dropped at Slice B,
 * T076): Platform Content Full Access, and Platform Resource Admin (operator
 * amendment 2026-10-07). The order is the audit attribution order: a holder
 * of both is recorded as Content Full Access.
 */
export const getCalloutPublisherPlatformCredentialTypes =
  (): AuthorizationCredential[] => [
    AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
    AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
  ];
