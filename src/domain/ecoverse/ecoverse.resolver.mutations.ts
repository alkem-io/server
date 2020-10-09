import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql/dist/decorators';
import { UserGroup } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
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
  ): Promise<IUserGroup> {
    const group = await this.ecoverseService.createGroupOnEcoverse(groupName);
    return group;
  }
}
