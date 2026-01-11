import { groupBy } from 'lodash';
import { Logger } from '@nestjs/common';
import { Space } from '@domain/space/space/space.entity';
import { RolesResultSpace } from '../dto/roles.dto.result.space';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { CredentialMap } from './group.credentials.by.entity';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';

const logger = new Logger(LogContext.ROLES);

export const getSpaceRolesForActorQueryResult = (
  map: CredentialMap,
  spaces: Space[],
  subspaces: Space[],
  actorContext: ActorContext,
  authorizationService: AuthorizationService
): RolesResultSpace[] => {
  const subspacesByLevelZero = groupBy(subspaces, 'levelZeroSpaceID');
  const spacesCredentialsMap = map.get('spaces');

  const results = spaces.map(space => {
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
    // can this actor read this space
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
      // can the actor read this subspace?
      const readAccessSubspace = authorizationService.isAccessGranted(
        actorContext,
        subspace.authorization,
        AuthorizationPrivilege.READ_ABOUT
      );
      if (!readAccessSubspace) {
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
