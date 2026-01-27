import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IAiServer } from './ai.server.interface';
import { AiServerService } from './ai.server.service';

@InstrumentResolver()
@Resolver(() => IAiServer)
export class AiServerResolverQueries {
  constructor(private aiServerService: AiServerService) {}

  @Query(() => IAiServer, {
    nullable: false,
    description: 'Alkemio AiServer',
  })
  async aiServer(): Promise<IAiServer> {
    return await this.aiServerService.getAiServerOrFail();
  }
}
