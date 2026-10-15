import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';

/**
 * The "collection" framings that are admin-only and collaboration-only
 * (FR-004a/FR-004d/FR-004f, R5). None of them is level-restricted.
 */
const RESTRICTED_FRAMING_TYPES: readonly CalloutFramingType[] = [
  CalloutFramingType.CONTRIBUTORS,
  CalloutFramingType.SPACES,
  CalloutFramingType.FORM,
];

export const isRestrictedCollaborationFraming = (
  framingType: CalloutFramingType | undefined
): framingType is CalloutFramingType =>
  framingType !== undefined && RESTRICTED_FRAMING_TYPES.includes(framingType);

/**
 * Shared admin-only + collaboration-only guard for the restricted framings:
 * reject on non-COLLABORATION callouts sets, and require CREATE (space admin)
 * even when allowMembersToCreateCallouts maps CREATE_CALLOUT to CONTRIBUTE.
 *
 * Both the create and the update mutation go through this one owner, so the
 * restriction cannot be bypassed by converting an existing callout — and the
 * two paths cannot drift as the restricted set grows (SEC-084-01).
 */
export const assertAdminOnlyCollaborationFraming = (
  authorizationService: AuthorizationService,
  actorContext: ActorContext,
  calloutsSet: ICalloutsSet | undefined,
  framingType: CalloutFramingType
): void => {
  const label = framingType.toUpperCase();
  if (calloutsSet?.type !== CalloutsSetType.COLLABORATION) {
    throw new ValidationException(
      `${label} framing is only available on COLLABORATION callouts sets.`,
      LogContext.COLLABORATION
    );
  }
  authorizationService.grantAccessOrFail(
    actorContext,
    calloutsSet.authorization,
    AuthorizationPrivilege.CREATE,
    `${label} callout framing (admin-only) on callouts Set: ${calloutsSet.id}`
  );
};
