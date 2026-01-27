import { DELETED_ACTOR_ID } from '@common/constants/system.actor.ids';
import { ProfileType } from '@common/enums';
import { AgentType } from '@common/enums/agent.type';
import { IContributor } from './contributor.interface';

const EPOCH = new Date(0);

/**
 * Synthetic contributor returned for system actor IDs (deleted users, matrix bot).
 * Frontend knows how to display these as "Unknown" or similar.
 */
export const UNKNOWN_CONTRIBUTOR: IContributor = {
  id: DELETED_ACTOR_ID,
  nameID: 'unknown',
  createdDate: EPOCH,
  updatedDate: EPOCH,
  profile: {
    id: '',
    displayName: '',
    type: ProfileType.USER,
    createdDate: EPOCH,
    updatedDate: EPOCH,
  },
  agent: {
    id: DELETED_ACTOR_ID,
    type: AgentType.USER,
    createdDate: EPOCH,
    updatedDate: EPOCH,
  },
};
