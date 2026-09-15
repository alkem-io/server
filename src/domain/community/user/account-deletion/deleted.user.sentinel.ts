import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

/**
 * A fixed, non-localized "former member" identifier — English server
 * constant, deliberately never translated. See FR-022: this sentinel
 * attribution is a recorded v1 limitation, not a defect.
 */
export const DELETED_USER_SENTINEL_DISPLAY_NAME = 'Former member';

/**
 * A stable, non-UUID-colliding placeholder id for the sentinel. Distinct
 * from any real actor id — it is never looked up, only rendered.
 */
export const DELETED_USER_SENTINEL_ID = '00000000-0000-0000-0000-000000000000';

/**
 * A closed, always-deny authorization policy: no credential rules and no
 * privilege rules ever grant access. Substituted wherever a resolver would
 * otherwise need to load the real (nonexistent) policy row for the
 * sentinel, so a privilege check against it fails closed rather than
 * throwing.
 */
export const DELETED_USER_SENTINEL_AUTHORIZATION = {
  id: DELETED_USER_SENTINEL_ID,
  type: AuthorizationPolicyType.USER,
  credentialRules: [],
  privilegeRules: [],
} as unknown as IAuthorizationPolicy;

/**
 * An empty, already-emptied storage bucket: no documents, nothing
 * allowed to be stored. Substituted for `Profile.storageBucket`
 * (non-null) so selecting it for the sentinel resolves instead of
 * rejecting on a nonexistent bucket row.
 */
export const DELETED_USER_SENTINEL_STORAGE_BUCKET = {
  id: DELETED_USER_SENTINEL_ID,
  documents: [],
  allowedMimeTypes: [],
  maxFileSize: 0,
  authorization: DELETED_USER_SENTINEL_AUTHORIZATION,
} as unknown as IStorageBucket;

/**
 * Static payload substituted for a deleted user's activity-feed
 * attribution, so an entry authored by a departed user still renders (with
 * neutral attribution) instead of being dropped — with zero database lookup
 * and zero warning-log entry. See `ActivityLogService` and FR-022.
 *
 * Every field a resolver could reach from this object is itself a static,
 * self-contained value — never another dataloader key — so no downstream
 * field resolver can key a batch load on this id. See
 * `UserResolverFields`/`ProfileResolverFields` for the short-circuits that
 * return these values directly instead of touching a loader.
 */
export const DELETED_USER_SENTINEL = {
  id: DELETED_USER_SENTINEL_ID,
  type: ActorType.USER,
  nameID: 'former-member',
  accountID: '',
  rowId: 0,
  firstName: '',
  lastName: '',
  serviceProfile: false,
  email: '',
  authenticationID: null,
  profile: {
    id: DELETED_USER_SENTINEL_ID,
    displayName: DELETED_USER_SENTINEL_DISPLAY_NAME,
    tagline: undefined,
    description: undefined,
    storageBucket: DELETED_USER_SENTINEL_STORAGE_BUCKET,
  },
  settings: undefined,
  storageAggregator: undefined,
  credentials: [],
  authorization: DELETED_USER_SENTINEL_AUTHORIZATION,
} as unknown as IUser;
