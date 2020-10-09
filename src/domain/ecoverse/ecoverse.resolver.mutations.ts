import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql/dist/decorators';
import { UserGroup } from '../user-group/user-group.entity';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverMutations {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Mutation(() => UserGroup, {
    description: 'Creates a new user group at the ecoverse level',
  })
  async createGroupOnEcoverse(
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<UserGroup> {
    const group = await this.ecoverseService.createGroupOnEcoverse(groupName);
    return group as UserGroup;
  }
}
