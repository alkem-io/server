import { AuthorizationCredential } from '@common/enums';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

/**
 * The platform credentials that may read a DRAFT Post wherever the Post is
 * reachable. This is the single definition: the draft-Post read rule and the
 * Form response access owner both build on it, so a change to the platform
 * roles (for example the split of Global Support) reaches both at once.
 */
export const getDraftCalloutPlatformReadCredentials =
  (): ICredentialDefinition[] => [
    { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
    { type: AuthorizationCredential.GLOBAL_SUPPORT, resourceID: '' },
  ];

/**
 * The platform credential types that may change who publishes a Post
 * (UPDATE_CALLOUT_PUBLISHER). Kept next to the draft read list so every
 * platform credential of a callout rule lives in one place.
 */
export const getCalloutPublisherPlatformCredentialTypes =
  (): AuthorizationCredential[] => [
    AuthorizationCredential.GLOBAL_ADMIN,
    AuthorizationCredential.GLOBAL_SUPPORT,
    AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
  ];
