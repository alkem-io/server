import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { HubService } from '@domain/challenge/hub/hub.service';

@Resolver(() => IInnovationHub)
export class InnovationHubFieldResolver {
  constructor(
    private hubService: InnovationHubService,
    private spaceService: HubService
  ) {}

  @ResolveField(() => IInnovationHub)
  public async spacesListFilter(
    @Parent() hub: IInnovationHub
  ): Promise<IHub[]> {
    const filter = await this.hubService.getSpaceListFilterOrFail(hub.id);

    if (!filter) {
      return [];
    }

    return this.spaceService.getHubsById(filter);
  }
}
