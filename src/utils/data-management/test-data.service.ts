import { Injectable } from '@nestjs/common';
import { ActorGroupInput } from '../../domain/actor-group/actor-group.dto';
import { ActorGroupService } from '../../domain/actor-group/actor-group.service';
import { ActorInput } from '../../domain/actor/actor.dto';
import { AspectInput } from '../../domain/aspect/aspect.dto';
import { ChallengeInput } from '../../domain/challenge/challenge.dto';
import { IChallenge } from '../../domain/challenge/challenge.interface';
import { ChallengeService } from '../../domain/challenge/challenge.service';
import { EcoverseService } from '../../domain/ecoverse/ecoverse.service';
import { OpportunityInput } from '../../domain/opportunity/opportunity.dto';
import { OpportunityService } from '../../domain/opportunity/opportunity.service';
import { ProjectInput } from '../../domain/project/project.dto';
import { ProjectService } from '../../domain/project/project.service';
import { RelationInput } from '../../domain/relation/relation.dto';
import { UserGroupService } from '../../domain/user-group/user-group.service';
import { UserInput } from '../../domain/user/user.dto';
import { IUser } from '../../domain/user/user.interface';
import { UserService } from '../../domain/user/user.service';
import { DataManagementService } from './data-management.service';

@Injectable()
export class TestDataService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private userGroupService: UserGroupService,
    private projectService: ProjectService,
    private actorGroupService: ActorGroupService,
    private dataManagementService: DataManagementService
  ) {}

  async initDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
    await this.dataManagementService.load_sample_data();
  }

  async teardownDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
  }

  async initUsers() {
    const user = new UserInput();
    user.firstName = 'Bat';
    user.lastName = 'Georgi';
    user.email = 'testuser@test.com';
    user.name = 'Bat Georgi';
    user.accountUpn = 'testAccountUpn@test.com';
    user.profileData = {
      avatar: 'test profile avatar',
      description: 'test profile description',
      tagsetsData: [{ name: 'test' }],
    };
    await this.ecoverseService.createUser(user);
  }

  async initChallenge() {
    const challenge = new ChallengeInput();
    OpportunityInput;
    challenge.name = 'init challenege name';
    challenge.state = 'init challenge state';
    challenge.textID = 'init-challenge';
    challenge.context = {
      background: 'test challenge background',
      impact: 'test challenge impact',
      references: [
        {
          name: 'test ref challenge name',
          uri: 'test ref challenge uri',
          description: 'test ref challenge description',
        },
      ],
      tagline: 'test challenge tagline',
      vision: 'test challenge vision',
      who: 'test challenge who',
    };
    challenge.tags = ['test1', 'test2'];
    await this.ecoverseService.createChallenge(challenge);
  }

  async initOpportunity() {
    const opportunity = new OpportunityInput();
    opportunity.name = 'init opportunity name';
    opportunity.state = 'init opportunity state';
    opportunity.textID = 'init-opport';
    opportunity.context = {
      background: 'test opportunity background',
      impact: 'test opportunity impact',
      references: [
        {
          name: 'test ref opp name',
          uri: 'test ref opp uri',
          description: 'test ref opp description',
        },
      ],
      tagline: 'test opportunity tagline',
      vision: 'test opportunity vision',
      who: 'test opportunity who',
    };
    await this.challengeService.createOpportunity(4, opportunity);
  }

  async initProject() {
    const project = new ProjectInput();
    project.name = 'init project name';
    project.state = 'init project state';
    project.textID = 'init-project';
    project.description = 'init project description';
    await this.opportunityService.createProject(1, project);
  }

  async initAspect() {
    const aspect = new AspectInput();
    aspect.explanation = 'init aspect explanation';
    aspect.framing = 'init aspect framing';
    aspect.title = 'init aspect title';
    await this.opportunityService.createAspect(1, aspect);
  }

  async initAspectOnProject() {
    const aspect = new AspectInput();
    aspect.explanation = 'init project aspect explanation';
    aspect.framing = 'init project aspect framing';
    aspect.title = 'init project aspect title';
    await this.projectService.createAspect(1, aspect);
  }

  async initRelation() {
    const relation = new RelationInput();
    relation.actorName = 'init relation actor name';
    relation.actorRole = 'init relation actor role';
    relation.actorType = 'init relation actor type';
    relation.description = 'init relation description';
    relation.type = 'incoming';
    await this.opportunityService.createRelation(1, relation);
  }

  async initAddUserToOpportunity() {
    await this.opportunityService.addMember(1, 1);
  }

  async initAddChallengeLead() {
    await this.challengeService.addChallengeLead(4, 1);
  }

  async initCreateGroupOnEcoverse() {
    await this.ecoverseService.createGroup('ecoverseTestGroup');
  }

  async initCreateGroupOnChallenge() {
    await this.challengeService.createGroup(4, 'challengeTestGroup');
  }

  async initAssignGroupFocalPoint() {
    await this.userGroupService.assignFocalPoint(13, 13);
  }

  async initAddUserToChallengeGroup() {
    await this.userGroupService.addUser(13, 14);
  }

  async initActorGroup() {
    const actorGroup = new ActorGroupInput();
    actorGroup.name = 'init actorGroup name';
    actorGroup.description = 'init actorGroup description';
    await this.opportunityService.createActorGroup(1, actorGroup);
  }

  async initActor() {
    const actorGroup = new ActorInput();
    actorGroup.name = 'init actor name';
    actorGroup.impact = 'init actor impact';
    actorGroup.value = 'init actor value';
    actorGroup.description = 'init actor description';
    await this.actorGroupService.createActor(1, actorGroup);
  }

  async initAddAdmin() {
    const batGergi = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as any;
    const testGroup = await this.ecoverseService.createGroup('test');
    await this.userGroupService.addUserToGroup(batGergi?.id, testGroup);
  }

  async teardownUsers() {
    const batGergi = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.ecoverseService.removeUser(batGergi?.id);
  }

  async teardownChallenges() {
    const challengeToRemove = (await this.challengeService.getChallengeByID(
      1
    )) as IChallenge;
    await this.challengeService.removeChallenge(challengeToRemove?.id);
  }
}
