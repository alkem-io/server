import { Resolver, Query } from '@nestjs/graphql';
import { Application } from '@domain/application/application.entity';

@Resolver(() => Application)
export class ApplicationResolver {
  @Query(() => [Application], {
    nullable: false,
    description: 'All applications to join',
  })
  async applications(): Promise<Application[]> {
    return [];
  }
}
