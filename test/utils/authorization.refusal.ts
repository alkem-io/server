import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { randomUUID } from 'crypto';
import { vi } from 'vitest';

const ACTOR_CREDENTIAL = 'test-actor-credential';

/** A real AuthorizationService with a silent logger. */
export const realAuthorizationService = () =>
  new AuthorizationService({
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
  } as any);

/** An actor whose credentials match the policies built by `policyGranting`. */
export const testActor = (actorID: string = randomUUID()): ActorContext => {
  const actor = new ActorContext();
  actor.actorID = actorID;
  actor.credentials = [{ type: ACTOR_CREDENTIAL, resourceID: actorID }];
  return actor;
};

/**
 * A policy granting `testActor()` exactly the given privileges. With none, it
 * still holds a credential rule (for someone else), so it is a valid policy
 * that refuses the actor.
 */
export const policyGranting = (
  privileges: AuthorizationPrivilege[],
  id: string = randomUUID(),
  type: AuthorizationPolicyType = AuthorizationPolicyType.CALLOUT
): IAuthorizationPolicy =>
  ({
    id,
    type,
    credentialRules: [
      {
        name: 'test-rule',
        cascade: false,
        grantedPrivileges:
          privileges.length > 0 ? privileges : [AuthorizationPrivilege.READ],
        criterias: [
          {
            type:
              privileges.length > 0 ? ACTOR_CREDENTIAL : 'nobody-holds-this',
            resourceID: '',
          },
        ],
      },
    ],
    privilegeRules: [],
  }) as unknown as IAuthorizationPolicy;

/** The exception `grantAccessOrFail` throws for a missing privilege. */
export const grantAccessRefusal = (
  privilege: AuthorizationPrivilege = AuthorizationPrivilege.UPDATE,
  msg = 'test operation',
  actor: ActorContext = testActor(),
  policy: IAuthorizationPolicy = policyGranting([])
): ForbiddenAuthorizationPolicyException => {
  try {
    realAuthorizationService().grantAccessOrFail(actor, policy, privilege, msg);
  } catch (error) {
    return error as ForbiddenAuthorizationPolicyException;
  }
  throw new Error('grantAccessOrFail granted access');
};
