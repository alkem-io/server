import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

/**
 * Context for the actor making a request.
 * Contains identity and credentials for authorization decisions.
 * Cached by actorID for performance.
 */
export class ActorContext {
  /** The Actor ID - for users this is the user's ID since User IS an Actor */
  actorID: string = '';

  /** Credentials for authorization decisions */
  credentials: ICredentialDefinition[] = [];

  /** Whether this is an anonymous (unauthenticated) request */
  isAnonymous: boolean = false;

  /** Whether this is a guest request - guest name is populated */
  isGuest: boolean = false;

  /** Kratos identity ID (immutable, stable across email changes) */
  authenticationID?: string;

  /** Guest name for guest users (not authenticated but named) */
  guestName?: string;

  /** Session expiry timestamp (milliseconds since epoch) - for session management */
  expiry?: number;

  /**
   * Assistant attribution (004-web-ai-assistant, FR-016/FR-019). Present on the
   * two MCP-host assistant auth paths, both of which attribute the action to the
   * `virtual-assistant` actor:
   *
   *   - DELEGATED (Flow A, user-initiated): the assistant authenticates as
   *     itself but authorizes entities AS the on-behalf-of user. `actorID` /
   *     `credentials` are the USER's (so AuthorizationService decisions are
   *     byte-identical to GraphQL ⇒ effective ⊆ user privileges);
   *     `assistantActorId` is the acting assistant (attribution only);
   *     `onBehalfOfUserId` is the user (== `actorID`).
   *   - SYSTEM-INVOKED (Flow B, no user): the assistant authenticates AS the
   *     `virtual-assistant` actor. `actorID` / `credentials` are the ACTOR's
   *     (buildForActor); `assistantActorId` == `actorID`; `onBehalfOfUserId` is
   *     `null` (there is no user). The per-tool gate then uses the ACTOR's admin
   *     `capabilityGrant` rather than a user grant.
   *
   * Absent on ordinary user contexts and anonymous contexts.
   */
  delegationContext?: ActorDelegationContext;
}

/**
 * Attribution metadata for an assistant request. The assistant actor is recorded
 * for attribution (FR-016/SC-010); authorization still flows entirely through
 * the credentials on the enclosing ActorContext (the user's in Flow A, the
 * actor's own in Flow B).
 */
export interface ActorDelegationContext {
  /** The assistant actor the action is attributed to (always set). */
  assistantActorId: string;
  /**
   * The user the assistant is acting on behalf of in Flow A (== ActorContext.
   * actorID). `null` for a SYSTEM-INVOKED (Flow B) actor call — there is no
   * on-behalf-of user; the gate then uses the actor's admin grant (FR-019).
   */
  onBehalfOfUserId: string | null;
}
