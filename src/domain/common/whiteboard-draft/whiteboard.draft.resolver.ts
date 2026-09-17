import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { ActorContext } from '@core/actor-context/actor.context';
import { UUID } from '@domain/common/scalars';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WhiteboardDraftService } from './whiteboard.draft.service';

@InstrumentResolver()
@Resolver()
export class WhiteboardDraftResolver {
  constructor(private readonly service: WhiteboardDraftService) {}

  @Mutation(() => UUID, {
    description:
      'Idempotently discards a server-owned live Whiteboard draft through the canonical Whiteboard deletion path.',
  })
  async deleteWhiteboardDraft(
    @CurrentActor() actorContext: ActorContext,
    @Args('whiteboardID', { type: () => UUID }) whiteboardID: string
  ): Promise<string> {
    return this.service.discard(whiteboardID, actorContext);
  }
}
