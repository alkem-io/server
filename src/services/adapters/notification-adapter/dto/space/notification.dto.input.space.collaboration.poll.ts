import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * Base DTO for all poll notification events.
 * Used for:
 *   - SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL
 *   - SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON
 *   - SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON
 *   - SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE
 */
export interface NotificationInputCollaborationPoll
  extends NotificationInputBase {
  /** ID of the specific recipient (the user to notify). */
  userID: string;
  /** ID of the Poll. */
  pollID: string;
  /** ID of the Callout the poll belongs to (used to resolve the space). */
  calloutID: string;
}

export type NotificationInputCollaborationPollVoteCastOnOwnPoll =
  NotificationInputCollaborationPoll;

export type NotificationInputCollaborationPollVoteCastOnPollIVotedOn =
  NotificationInputCollaborationPoll;

export type NotificationInputCollaborationPollModifiedOnPollIVotedOn =
  NotificationInputCollaborationPoll;

export type NotificationInputCollaborationPollVoteAffectedByOptionChange =
  NotificationInputCollaborationPoll;
