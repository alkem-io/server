import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

/**
 * Context for the actor making a request.
 * Contains identity and credentials for authorization decisions.
 * Cached by actorId for performance.
 */
export class ActorContext {
  /** The Actor ID - for users this is the user's ID since User IS an Actor */
  actorId: string = '';

  /** Credentials for authorization decisions */
  credentials: ICredentialDefinition[] = [];

  /** Whether this is an anonymous (unauthenticated) request */
  isAnonymous: boolean = false;

  /** Kratos identity ID (immutable, stable across email changes) */
  authenticationID?: string;

  /** Guest name for guest users (not authenticated but named) */
  guestName?: string;

  /** Session expiry timestamp (milliseconds since epoch) - for session management */
  expiry?: number;
}
