import { Query, Resolver } from '@nestjs/graphql';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';

@Resolver(() => IPlatform)
export class PlatformResolverQueries {
  constructor(private platformService: PlatformService) {}

  @Query(() => IPlatform, {
    nullable: false,
    description: 'Alkemio Platform',
  })
  async platform(): Promise<IPlatform> {
    return await this.platformService.getPlatformOrFail();
  }
}
