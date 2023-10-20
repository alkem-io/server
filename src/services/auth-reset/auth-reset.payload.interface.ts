import { AUTH_RESET_EVENT_TYPE } from './event.type';

/**
 * The payload type of the event
 */
export interface AuthResetEventPayload {
  /**
   * the type of the event
   */
  type: AUTH_RESET_EVENT_TYPE;
  /**
   * the uuid of the entity
   */
  id: string;
  /**
   * the task uuid associated with this event
   */
  task: string;
}
