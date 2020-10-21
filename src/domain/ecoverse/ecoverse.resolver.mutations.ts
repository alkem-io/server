import { Get, Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql/dist/decorators';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { ChallengeInput } from '../challenge/challenge.dto';
import { Challenge } from '../challenge/challenge.entity';
import { IChallenge } from '../challenge/challenge.interface';
import { OrganisationInput } from '../organisation/organisation.dto';
import { Organisation } from '../organisation/organisation.entity';
import { IOrganisation } from '../organisation/organisation.interface';
import { UserGroup } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserInput } from '../user/user.dto';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { EcoverseInput } from './ecoverse.dto';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
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
    const group = await this.ecoverseService.createGroup(groupName);
    return group;
  }

  @Mutation(() => Ecoverse, {
    description: 'Updates the Ecoverse with the provided data',
  })
  async updateEcoverse(
    @Args('ecoverseData') ecoverseData: EcoverseInput
  ): Promise<IEcoverse> {
    const ctVerse = await this.ecoverseService.update(ecoverseData);
    return ctVerse;
  }

  @Get()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Creates a new user as a member of the ecoverse',
  })
  async createUser(@Args('userData') userData: UserInput): Promise<IUser> {
    const user = await this.ecoverseService.createUser(userData);
    return user;
  }

  @Mutation(() => Boolean, {
    description: 'Removes the specified user from the ecoverse',
  })
  async removeUser(@Args('userID') userID: number): Promise<boolean> {
    const success = await this.ecoverseService.removeUser(userID);
    return success;
  }

  @Mutation(() => Challenge, {
    description: 'Creates a new challenge and registers it with the ecoverse',
  })
  async createChallenge(
    @Args('challengeData') challengeData: ChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.ecoverseService.createChallenge(challengeData);

    return challenge;
  }

  @Mutation(() => Organisation, {
    description:
      'Creates a new organisation and registers it with the ecoverse',
  })
  async createOrganisation(
    @Args('organisationData') organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.ecoverseService.createOrganisation(
      organisationData
    );

    return organisation;
  }
}
