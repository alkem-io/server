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
          uri: 'test ref challenge uri',
          description: 'test ref challenge description',
        },
      ],
      tagline: 'test challenge tagline',
      vision: 'test challenge vision',
      who: 'test challenge who',
    };
    challenge.tags = ['test1', 'test2'];
    const response = await this.ecoverseService.createChallenge(challenge);
    return response.id;
  }

  async initChallengeLeadOrganisation(): Promise<number> {
    const challenge = new ChallengeInput();
    challenge.name = 'init challenege name 2';
    challenge.state = 'init challenge state 2';
    challenge.textID = 'init-challenge2';
    challenge.context = {
      background: 'test challenge background 2',
      impact: 'test challenge impact 2',
      references: [
        {
          name: 'test ref challenge name 2',
          uri: 'test ref challenge uri 2',
          description: 'test ref challenge description 2',
        },
      ],
      tagline: 'test challenge tagline 2',
      vision: 'test challenge vision 2',
      who: 'test challenge who 2',
    };
    challenge.tags = ['test3', 'test4'];
    const response = await this.ecoverseService.createChallenge(challenge);
    return response.id;
  }

  async initChallengeActor(): Promise<number> {
    const challenge = new ChallengeInput();
    challenge.name = 'init challenege name 3';
    challenge.state = 'init challenge state 3';
    challenge.textID = 'init-challenge3';
    challenge.context = {
      background: 'test challenge background 3',
      impact: 'test challenge impact 3',
      references: [
        {
          name: 'test ref challenge name 3',
          uri: 'test ref challenge uri 3',
          description: 'test ref challenge description 3',
        },
      ],
      tagline: 'test challenge tagline 3',
      vision: 'test challenge vision 3',
      who: 'test challenge who 3',
    };
    challenge.tags = ['test5', 'test6'];
    const response = await this.ecoverseService.createChallenge(challenge);
    return response.id;
  }

  async initChallengeDelete(): Promise<number> {
    const challenge = new ChallengeInput();
    challenge.name = 'init challenege name 4';
    challenge.state = 'init challenge state 4';
    challenge.textID = 'init-challenge4';
    const response = await this.ecoverseService.createChallenge(challenge);
    return response.id;
  }

  async initOpportunity(challengeId: number): Promise<number> {
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
    const response = await this.challengeService.createOpportunity(
      challengeId,
      opportunity
    );
    return response.id;
  }

  async initOpportunityActor(challengeId: number): Promise<number> {
    const opportunity = new OpportunityInput();
    opportunity.name = 'init opportunity name2';
    opportunity.state = 'init opportunity state2';
    opportunity.textID = 'init-opport2';
    opportunity.context = {
      background: 'test opportunity background2',
      impact: 'test opportunity impact2',
      references: [
        {
          name: 'test ref opp name2',
          uri: 'test ref opp uri2',
          description: 'test ref opp description2',
        },
      ],
      tagline: 'test opportunity tagline2',
      vision: 'test opportunity vision2',
      who: 'test opportunity who2',
    };
    const response = await this.challengeService.createOpportunity(
      challengeId,
      opportunity
    );
    return response.id;
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
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.opportunityService.addMember(createdTestUser?.id, 1);
  }

  async initAddChallengeLead(challengeId: number) {
    await this.challengeService.addChallengeLead(challengeId, 1);
  }

  async initCreateGroupOnEcoverse() {
    await this.ecoverseService.createGroup('ecoverseTestGroup');
  }

  async initCreateGroupOnChallenge() {
    await this.challengeService.createGroup(4, 'challengeTestGroup');
  }

  async initAssignGroupFocalPoint() {
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.userGroupService.assignFocalPoint(createdTestUser?.id, 13);
  }

  async initAddUserToChallengeGroup() {
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.userGroupService.addUser(createdTestUser?.id, 14);
  }

  async initActorGroup(opportunityId: number): Promise<number> {
    const actorGroup = new ActorGroupInput();
    actorGroup.name = 'init actorGroup name';
    actorGroup.description = 'init actorGroup description';
    const response = await this.opportunityService.createActorGroup(
      opportunityId,
      actorGroup
    );
    return response.id;
  }

  async initActor(actorGroupId: number) {
    const actorGroup = new ActorInput();
    actorGroup.name = 'init actor name';
    actorGroup.impact = 'init actor impact';
    actorGroup.value = 'init actor value';
    actorGroup.description = 'init actor description';
    await this.actorGroupService.createActor(actorGroupId, actorGroup);
  }

  async initAddAdmin() {
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as any;
    const testGroup = await this.ecoverseService.createGroup('test');
    await this.userGroupService.addUserToGroup(createdTestUser?.id, testGroup);
  }

  async teardownRemoveGroupFocalPoint() {
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.userGroupService.removeFocalPoint(13);
  }

  async teardownUsers() {
    const createdTestUser = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.ecoverseService.removeUser(createdTestUser?.id);
  }

  async teardownChallenges() {
    const challengeToRemove = (await this.challengeService.getChallengeByID(
      1
    )) as IChallenge;
    await this.challengeService.removeChallenge(challengeToRemove?.id);
  }

  async initFunctions() {
    // await this.initUsers();
    await this.initOpportunity(await this.initChallenge());
    // await this.initProject();
    // await this.initAspect();
    // await this.initAspectOnProject();
    // await this.initRelation();
    // await this.initActorGroup();
    await this.initActor(
      await this.initActorGroup(
        await this.initOpportunityActor(await this.initChallengeActor())
      )
    );
    // await this.initAddUserToOpportunity();
    await this.initAddChallengeLead(await this.initChallengeLeadOrganisation());
    await this.initAddChallengeLead(1);
    await this.initChallengeDelete();
    // await this.initCreateGroupOnEcoverse();
    // await this.initCreateGroupOnChallenge();
    // await this.initAddUserToChallengeGroup();
    // await this.initAssignGroupFocalPoint();
  }

  // async teardownFunctions() {
  //   // await this.teardownRemoveGroupFocalPoint();
  //   // await this.teardownUsers();
  //   // await this.teardownChallenges();
  // }
}
