import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { MatrixSessionCredentials } from './dto/matrix.session.credentials';
import { MatrixSessionService } from './matrix.session.service';

/**
 * Matrix chat session mint for the CURRENT actor (workspace#091,
 * FR-007/FR-008). Structurally caller-scoped: this mutation takes NO
 * arguments at all, so there is no subject to authorize and no way to ask for
 * someone else's session.
 */
@InstrumentResolver()
@Resolver()
export class MatrixSessionResolverMutations {
  constructor(private readonly matrixSessionService: MatrixSessionService) {}

  @Mutation(() => MatrixSessionCredentials, {
    description:
      "Mint a Matrix access token for the current user's own chat session. Takes no subject: the actor is the authenticated caller.",
  })
  async mintMatrixSession(
    @CurrentActor() actorContext: ActorContext
  ): Promise<MatrixSessionCredentials> {
    if (!actorContext.actorID || actorContext.isAnonymous) {
      throw new ForbiddenException(
        'Caller must be an authenticated user for this operation.',
        LogContext.COMMUNICATION,
        { description: 'mintMatrixSession' }
      );
    }

    return this.matrixSessionService.mintForActor(actorContext.actorID);
  }
}
