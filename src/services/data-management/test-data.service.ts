import { Injectable } from '@nestjs/common';
import { ActorGroupInput } from '@domain/context/actor-group/actor-group.dto';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { ActorInput } from '@domain/context/actor/actor.dto';
import { AspectInput } from '@domain/context/aspect/aspect.dto';
import { ChallengeInput } from '@domain/challenge/challenge/challenge.dto.create';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OpportunityInput } from '@domain/challenge/opportunity/opportunity.dto.create';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { ProjectInput } from '@domain/collaboration/project/project.dto';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { RelationInput } from '@domain/collaboration/relation/relation.dto';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { DataManagementService } from './data-management.service';
import { OrganisationInput } from '@domain/community/organisation/organisation.dto.create';
import { CommunityService } from '@domain/community/community/community.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';

export type TestDataServiceInitResult = {
  userId: number;
  userProfileId: number;
  organisationId: number;
  challengeId: number;
  removeChallangeId: number;
  opportunityId: number;
  removeOpportunityId: number;
  projectId: number;
  aspectId: number;
  aspectOnProjectId: number;
  relationId: number;
  addUserToOpportunityId: number;
  groupIdEcoverse: number;
  createGroupOnChallengeId: number;
  assignGroupFocalPointId: number;
  actorGroupId: number;
  actorId: number;
  tagsetId: number;
  contextId: number;
};

@Injectable()
export class TestDataService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private communityService: CommunityService,
    private organisationService: OrganisationService,
    private opportunityService: OpportunityService,
    private userGroupService: UserGroupService,
    private projectService: ProjectService,
    private actorGroupService: ActorGroupService,
    private dataManagementService: DataManagementService
  ) {}

  async initDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
  }

  async teardownDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
  }

  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${this.uniqueTextId}`;
  groupName = `testGroup ${this.uniqueTextId}`;
  organisationName = `testOrganisation ${this.uniqueTextId}`;
  avatar = 'https://dev.cherrytwist.org/graphql';
  description = 'TestDescription';
  userEmail = 'qa.user@cherrytwist.org';

  async initOrganisation(): Promise<number> {
    const organisation = new OrganisationInput();
    organisation.name = `${this.organisationName}`;
    const response = await this.organisationService.createOrganisation(
      organisation
    );
    return response.id;
  }

  async initChallenge(): Promise<number> {
    const challenge = new ChallengeInput();

    challenge.name = `${this.challengeName}`;
    challenge.state = 'init challenge state';
    challenge.textID = `${this.uniqueTextId}`;
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
    return response.id;
  }

  async initRemoveChallenge(): Promise<number> {
    const challenge = new ChallengeInput();

    challenge.name = 'Remove-challemge';
    challenge.state = 'state';
    challenge.textID = 'remove-chall';
    challenge.tags = ['test1', 'test2'];
    const response = await this.ecoverseService.createChallenge(challenge);
    return response.id;
  }

  async initOpportunity(challengeId: number): Promise<number> {
    const opportunity = new OpportunityInput();
    opportunity.challengeID = `${challengeId}`;
    opportunity.name = 'init opportunity name';
    opportunity.state = 'init opportunity state';
    opportunity.textID = 'init-opport';
    opportunity.context = {
      background: 'test opportunity background',
      impact: 'test opportunity impact',
      references: [
        {
          name: 'test ref opp name',
          uri: 'https://test_ref_opp_uri.com',
          description: 'test ref opp description',
        },
      ],
      tagline: 'test opportunity tagline',
      vision: 'test opportunity vision',
      who: 'test opportunity who',
    };
    const response = await this.challengeService.createOpportunity(opportunity);
    return response.id;
  }

  async initRemoveOpportunity(challengeId: number): Promise<number> {
    const opportunity = new OpportunityInput();
    opportunity.challengeID = `${challengeId}`;
    opportunity.name = 'init remove opportunity name';
    opportunity.state = 'init opportunity state';
    opportunity.textID = 'remove-opport';
    const response = await this.challengeService.createOpportunity(opportunity);
    return response.id;
  }

  async initProject(opportunityId: number): Promise<number> {
    const project = new ProjectInput();
    project.name = 'init project name';
    project.state = 'init project state';
    project.textID = 'init-project';
    project.description = 'init project description';
    const response = await this.opportunityService.createProject(
      opportunityId,
      project
    );
    return response.id;
  }

  async initAspect(opportunityId: number): Promise<number> {
    const aspect = new AspectInput();
    aspect.explanation = 'init aspect explanation';
    aspect.framing = 'init aspect framing';
    aspect.title = 'init aspect title';
    const response = await this.opportunityService.createAspect(
      opportunityId,
      aspect
    );
    return response.id;
  }

  async initAspectOnProject(projectId: number): Promise<number> {
    const aspect = new AspectInput();
    aspect.explanation = 'init project aspect explanation';
    aspect.framing = 'init project aspect framing';
    aspect.title = 'init project aspect title';
    const response = await this.projectService.createAspect(projectId, aspect);
    return response.id;
  }

  async initRelation(opportunityId: number): Promise<number> {
    const relation = new RelationInput();
    relation.actorName = 'init relation actor name';
    relation.actorRole = 'init relation actor role';
    relation.actorType = 'init relation actor type';
    relation.description = 'init relation description';
    relation.type = 'incoming';
    const response = await this.opportunityService.createRelation(
      opportunityId,
      relation
    );
    return response.id;
  }

  async initAddUserToOpportunity(opportunityId: number): Promise<number> {
    const createdTestUser = (await this.userService.getUserByEmail(
      this.userEmail
    )) as IUser;
    const response = await this.communityService.addMember(
      createdTestUser?.id,
      opportunityId
    );
    return response.id;
  }

  async initCreateGroupOnEcoverse(): Promise<number> {
    const ecoverse = await this.ecoverseService.getDefaultEcoverseOrFail({
      relations: ['community'],
    });
    const community = ecoverse.community;
    if (!community) throw new Error();
    const response = await this.communityService.createGroup(
      community.id,
      this.groupName
    );
    return response.id;
  }

  async initCreateGroupOnChallenge(challengeId: number): Promise<number> {
    const community = await this.challengeService.getCommunity(challengeId);
    const response = await this.communityService.createGroup(
      community.id,
      this.groupName
    );
    return response.id;
  }

  async initAssignGroupFocalPoint(groupId: number): Promise<number> {
    const createdTestUser = (await this.userService.getUserByEmail(
      this.userEmail
    )) as IUser;
    const response = await this.userGroupService.assignFocalPoint(
      createdTestUser?.id,
      groupId
    );
    return response.id;
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

  async initActor(actorGroupId: number): Promise<number> {
    const actorGroup = new ActorInput();
    actorGroup.name = 'init actor name';
    actorGroup.impact = 'init actor impact';
    actorGroup.value = 'init actor value';
    actorGroup.description = 'init actor description';
    const response = await this.actorGroupService.createActor(
      actorGroupId,
      actorGroup
    );
    return response.id;
  }

  async teardownRemoveGroupFocalPoint(groupId: number) {
    await this.userGroupService.removeFocalPoint(groupId);
  }

  async initGetUserId(userEmail: string): Promise<number> {
    const response = await this.userService.getUserByEmailOrFail(userEmail);
    return response.id;
  }

  async initGetUserProfileId(userEmail: string): Promise<any> {
    const response = await this.userService.getUserByEmailOrFail(userEmail);
    return response.profile?.id;
  }

  async initGetTagsetId(challengeId: number): Promise<any> {
    const response = await this.challengeService.getChallengeByIdOrFail(
      challengeId
    );
    return response.tagset?.id;
  }

  async initGetContextId(challengeId: number): Promise<any> {
    const response = await this.challengeService.getChallengeByIdOrFail(
      challengeId
    );
    return response.context?.id;
  }

  async teardownChallenges(challengeId: number) {
    const challengeToRemove = (await this.challengeService.getChallengeByIdOrFail(
      challengeId
    )) as IChallenge;
    await this.challengeService.removeChallenge(challengeToRemove?.id);
  }

  async initFunctions(): Promise<TestDataServiceInitResult> {
    const userProfileId = await this.initGetUserProfileId(this.userEmail);
    const userId = await this.initGetUserId(this.userEmail);
    const organisationId = await this.initOrganisation();
    const challengeId = await this.initChallenge();
    const removeChallangeId = await this.initRemoveChallenge();
    const opportunityId = await this.initOpportunity(challengeId);
    const removeOpportunityId = await this.initRemoveOpportunity(
      removeChallangeId
    );
    const projectId = await this.initProject(opportunityId);
    const aspectId = await this.initAspect(opportunityId);
    const aspectOnProjectId = await this.initAspectOnProject(projectId);
    const relationId = await this.initRelation(opportunityId);
    const addUserToOpportunityId = await this.initAddUserToOpportunity(
      opportunityId
    );
    const groupIdEcoverse = await this.initCreateGroupOnEcoverse();
    const createGroupOnChallengeId = await this.initCreateGroupOnChallenge(
      challengeId
    );
    const assignGroupFocalPointId = await this.initAssignGroupFocalPoint(
      createGroupOnChallengeId
    );
    const actorGroupId = await this.initActorGroup(opportunityId);
    const actorId = await this.initActor(actorGroupId);
    const tagsetId = await this.initGetTagsetId(challengeId);
    const contextId = await this.initGetContextId(challengeId);

    return {
      userId,
      userProfileId,
      organisationId,
      challengeId,
      removeChallangeId,
      opportunityId,
      removeOpportunityId,
      projectId,
      aspectId,
      addUserToOpportunityId,
      groupIdEcoverse,
      aspectOnProjectId,
      relationId,
      createGroupOnChallengeId,
      assignGroupFocalPointId,
      actorGroupId,
      actorId,
      tagsetId,
      contextId,
    };
  }
}
