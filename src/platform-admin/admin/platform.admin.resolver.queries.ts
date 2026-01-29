import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformAdminQueryResults } from './dto/platform.admin.query.results';

@InstrumentResolver()
@Resolver()
export class PlatformAdminResolverQueries {
  @Query(() => PlatformAdminQueryResults, {
    nullable: false,
    description: 'Allow looking up of information for Platform administration.',
  })
  async platformAdmin(): Promise<PlatformAdminQueryResults> {
    return {} as PlatformAdminQueryResults;
  }
}
