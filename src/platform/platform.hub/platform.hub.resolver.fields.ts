import { InnovationHubArgsQuery } from '@domain/innovation-hub/dto/innovation.hub.args.query';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { IPlatform } from '@platform/platform/platform.interface';
import { InnovationHub as InnovationHubDecorator } from '@src/common/decorators';

@Resolver(() => IPlatform)
export class PlatformHubResolverFields {
  constructor(private innovationHubService: InnovationHubService) {}

  @ResolveField(() => IInnovationHub, {
    description: 'Details about the current Innovation Hub you are in.',
    nullable: true,
  })
  public innovationHub(
    @Args({
      nullable: true,
      description: 'Returns a matching Innovation Hub.',
    })
    args: InnovationHubArgsQuery,
    @InnovationHubDecorator() innovationHub?: InnovationHub
  ): Promise<IInnovationHub | undefined> {
    // if no arguments are provided, return the current ISpace
    if (!Object.keys(args).length) {
      return Promise.resolve(innovationHub as IInnovationHub);
    }

    return this.innovationHubService.getInnovationHubFlexOrFail({
      subdomain: args.subdomain,
      idOrNameId: args.id,
    });
  }
}
