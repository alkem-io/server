import { ActorType } from '@common/enums/actor.type';
import { IUser } from '@domain/community/user/user.interface';

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
 * Static payload substituted for a deleted user's activity-feed
 * attribution, so an entry authored by a departed user still renders (with
 * neutral attribution) instead of being dropped — with zero database lookup
 * and zero warning-log entry. See `ActivityLogService` and FR-022.
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
  },
  settings: undefined,
  storageAggregator: undefined,
  credentials: [],
  authorization: undefined,
} as unknown as IUser;
