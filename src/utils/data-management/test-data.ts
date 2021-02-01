import { Injectable } from '@nestjs/common';
import { ActorGroupInput } from '@domain/actor-group/actor-group.dto';
import { ActorGroupService } from '@domain/actor-group/actor-group.service';
import { ActorInput } from '@domain/actor/actor.dto';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { ChallengeInput } from '@domain/challenge/challenge.dto';
import { IChallenge } from '@domain/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge.service';
import { EcoverseService } from '@domain/ecoverse/ecoverse.service';
import { OpportunityInput } from '@domain/opportunity/opportunity.dto';
import { OpportunityService } from '@domain/opportunity/opportunity.service';
import { ProjectInput } from '@domain/project/project.dto';
import { ProjectService } from '@domain/project/project.service';
import { RelationInput } from '@domain/relation/relation.dto';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { UserInput } from '@domain/user/user.dto';
import { IUser } from '@domain/user/user.interface';
import { UserService } from '@domain/user/user.service';
import { DataManagementService } from './data-management.service';

@Injectable()
export class TestData {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private userGroupService: UserGroupService,
    private projectService: ProjectService,
    private actorGroupService: ActorGroupService
  ) {}

  async initUsers() {
    const user = new UserInput();
    user.firstName = 'Bat';
    user.lastName = 'Georgi';
    user.email = 'testuser@test.com';
    user.name = 'Bat Georgi';
    user.accountUpn = 'testAccountUpn@test.com';
    user.aadPassword = '687sd7ds&*';
    user.profileData = {
      avatar: 'test profile avatar',
      description: 'test profile description',
      tagsetsData: [{ name: 'test' }],
    };
    await this.ecoverseService.createUser(user);
  }

  async initChallenge(): Promise<number> {
    const challenge = new ChallengeInput();

    challenge.name = 'init challenege name';
    challenge.state = 'init challenge state';
    challenge.textID = 'init-challenge';
    challenge.context = {
      background: 'test challenge background',
      impact: 'test challenge impact',
      references: [
        {
          name: 'test ref challenge name',
          uri: 'https://test_ref_challenge_uri.com',
          description: 'test ref challenge description',
        },
      ],
      tagline: 'test challenge tagline',
      vision: 'test challenge vision',
      who: 'test challenge who',
    };
    challenge.tags = ['test1', 'test2'];
    const response = await this.ecoverseService.createChallenge(challenge);
    console.log(response.id);
    return response.id;
  }

  public async initFunction() {
    let returnObject = {
      challengeId: 0,
      opportunityId: 1,
    };
    let challengeId = await this.initChallenge();
    returnObject.challengeId = challengeId;
    console.log(returnObject.challengeId);
    //challengeId =    returnObject.challengeId;
    return challengeId;
  }
}
