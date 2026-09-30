import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Space } from '@domain/space/space/space.entity';
import { Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { RolesResultSpace } from '../dto/roles.dto.result.space';
import { CredentialMap } from './group.credentials.by.entity';

const logger = new Logger(LogContext.ROLES);

export const getSpaceRolesForContributorQueryResult = (
  map: CredentialMap,
  spaces: Space[],
  subspaces: Space[],
  actorContext: ActorContext,
  authorizationService: AuthorizationService
): RolesResultSpace[] => {
  const subspacesByLevelZero = groupBy(subspaces, 'levelZeroSpaceID');
  const spacesCredentialsMap = map.get('spaces');

  const results = spaces.map(space => {
    // `about.profile` IS requested by the query (see
    // get.space.roles.for.contributor.entity.data.ts) — a null here means the
    // row itself is incomplete, i.e. a credential resolved to a space whose
    // about/profile no longer exists. `RolesResultSpace`'s constructor
    // dereferences `space.about.profile.displayName` unguarded, so one such
    // row threw and took the WHOLE `rolesUser.spaces` query down rather than
    // omitting a single entry. Skip it exactly as a missing `authorization`
    // is skipped below. Live-confirmed 2026-07-30 by the gql-live track.
    if (!space.about?.profile) {
      logger.warn(
        {
          message: 'Space has no about profile',
          spaceID: space.id,
        },
        LogContext.ROLES
      );
      return;
    }

    const spaceResult = new RolesResultSpace(space);

    spaceResult.roles = spacesCredentialsMap?.get(space.id) ?? [];

    // Only return children of spaces that the current user has READ access to
    if (!space.authorization) {
      // skip spaces without authorization to avoid errors
      logger.warn(
        {
          message: 'Space has no authorization',
          spaceID: space.id,
        },
        LogContext.ROLES
      );
      return;
    }
    // can this agent read this space
    const readAccessSpace = authorizationService.isAccessGranted(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT
    );

    if (!readAccessSpace) {
      return;
    }

    const subspaceForSpace = subspacesByLevelZero[space.id];
    // exit early if there are no subspaces to process
    if (!subspaceForSpace) {
      return spaceResult;
    }

    for (const subspace of subspaceForSpace) {
      if (!subspace.authorization) {
        // skip subspace without authorization to avoid errors
        logger.warn(
          {
            message: 'Subspace has no authorization',
            subspaceID: subspace.id,
          },
          LogContext.ROLES
        );
        continue;
      }
      // can the agent read this subspace?
      const readAccessSubspace = authorizationService.isAccessGranted(
        actorContext,
        subspace.authorization,
        AuthorizationPrivilege.READ_ABOUT
      );
      if (!readAccessSubspace) {
        continue;
      }

      // Same unguarded dereference as the parent space above.
      if (!subspace.about?.profile) {
        logger.warn(
          {
            message: 'Subspace has no about profile',
            subspaceID: subspace.id,
          },
          LogContext.ROLES
        );
        continue;
      }

      const subspaceResult = new RolesResultCommunity(
        subspace.nameID,
        subspace.id,
        subspace.about.profile.displayName,
        subspace.level
      );
      subspaceResult.roles = spacesCredentialsMap?.get(subspace.id) ?? [];
      spaceResult.subspaces.push(subspaceResult);
    }

    return spaceResult;
  });

  return results.filter((result): result is RolesResultSpace => !!result);
};
