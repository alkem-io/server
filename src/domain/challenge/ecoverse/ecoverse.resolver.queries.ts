import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { Context } from '@domain/context/context/context.entity';
import { IContext } from '@domain/context/context/context.interface';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService,
    private organisationService: OrganisationService,
    private challengeService: ChallengeService
  ) {}

  @Query(() => String, {
    nullable: false,
    description: 'The name for this ecoverse',
  })
  @Profiling.api
  async name(): Promise<string> {
    return this.ecoverseService.getName();
  }

  @Query(() => Organisation, {
    nullable: false,
    description: 'The host organisation for the ecoverse',
  })
  @Profiling.api
  async host(): Promise<IOrganisation> {
    return this.ecoverseService.getHost();
  }

  @Query(() => Context, {
    nullable: false,
    description: 'The shared understanding for this ecoverse',
  })
  @Profiling.api
  async context(): Promise<IContext> {
    return this.ecoverseService.getContext();
  }
  @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
  @Profiling.api
  async challenges(): Promise<IChallenge[]> {
    const challenges = await this.ecoverseService.getChallenges();
    return challenges;
  }

  @Query(() => Challenge, {
    nullable: false,
    description: 'A particular challenge',
  })
  @Profiling.api
  async challenge(@Args('ID') id: number): Promise<IChallenge> {
    return await this.challengeService.getChallengeOrFail(id);
  }

  @Query(() => [Organisation], {
    nullable: false,
    description: 'All organisations',
  })
  @Profiling.api
  async organisations(): Promise<IOrganisation[]> {
    const organisations = await this.ecoverseService.getOrganisations();
    return organisations;
  }

  @Query(() => Organisation, {
    nullable: false,
    description: 'A particular organisation',
  })
  @Profiling.api
  async organisation(
    @Args('ID') id: number
  ): Promise<IOrganisation | undefined> {
    return await this.organisationService.getOrganisationOrFail(id, {
      relations: ['groups'],
    });
  }

  @Query(() => Tagset, {
    nullable: false,
    description: 'The tagset associated with this Ecoverse',
  })
  @Profiling.api
  async tagset(): Promise<ITagset> {
    return await this.ecoverseService.getTagset();
  }
}
