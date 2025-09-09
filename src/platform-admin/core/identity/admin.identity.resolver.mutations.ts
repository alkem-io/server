import { Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { AdminIdentityService } from './admin.identity.service';

@InstrumentResolver()
@Resolver()
export class AdminIdentityResolverMutations {
  constructor(private adminIdentityService: AdminIdentityService) {}
}
