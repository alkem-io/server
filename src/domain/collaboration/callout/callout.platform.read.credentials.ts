import { AuthorizationCredential } from '@common/enums';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

/**
 * The platform credentials that may read a DRAFT Post wherever the Post is
 * reachable. This is the single definition: the draft-Post read rule and the
 * Form response access owner both build on it, so a change to the platform
 * roles (for example the split of Global Support) reaches both at once.
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
 * T076): Platform Content Full Access alone.
 */
export const getCalloutPublisherPlatformCredentialTypes =
  (): AuthorizationCredential[] => [
    AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
  ];
