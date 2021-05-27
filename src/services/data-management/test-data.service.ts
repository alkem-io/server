import { Injectable } from '@nestjs/common';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { CreateChallengeInput } from '@domain/challenge/challenge/challenge.dto.create';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserService } from '@domain/community/user/user.service';
import { DataManagementService } from './data-management.service';
import { CreateOrganisationInput } from '@domain/community/organisation/organisation.dto.create';
import { CommunityService } from '@domain/community/community/community.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { ContextService } from '@domain/context/context/context.service';
import { EcosystemModelService } from '@domain/context/ecosystem-model/ecosystem-model.service';
import { CreateEcoverseInput } from '@domain/challenge';

export type TestDataServiceInitResult = {
  ecoverseId: string;
  // communityId: string;
  userId: string;
  // ecoverseAdminId: number;
  // globalAdminId: number;
  // communityAdminId: number;
  // ecoverseMemberId: number;
  // nonEcoverseId: number;
  userProfileId: string;
  organisationId: string;
  challengeId: string;
  removeChallangeId: string;
  opportunityId: string;
  removeOpportunityId: string;
  // projectId: number;
  // //aspectId: number;
  // aspectOnProjectId: number;
  // relationId: number;
  // //addUserToOpportunityId: number;
  // groupIdEcoverse: number;
  // createGroupOnChallengeId: number;
  //assignGroupFocalPointId: number;
  // actorGroupId: number;
  // actorId: number;
  tagsetId: string;
  contextId: string;
};

@Injectable()
export class TestDataService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private communityService: CommunityService,
    private contextService: ContextService,
    private ecosystemModelService: EcosystemModelService,
    private organisationService: OrganisationService,
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

  // async initEcoverseId(): Promise<string> {
  //   const response = await this.ecoverseService.getEcoverses();
  //   return response[0].id;
  // }

  async initEcoverseId(): Promise<string> {
    const response = await this.ecoverseService.getEcoverseOrFail('Eco1');
    return response.id;
  }

  async initEcoverse(): Promise<string> {
    const ecoverse = new CreateEcoverseInput();
    ecoverse.nameID = 'Test Ecoverse';
    const response = await this.ecoverseService.createEcoverse(ecoverse);
    return response.id;
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
  ecoverseMemberEmail = 'ecoverse-member@cherrytwist.com';
  ecoverseAdminEmail = 'ecoverse.admin@cherrytwist.org';
  globalAdminEmail = 'admin@cherrytwist.org';
  communityAdminEmail = 'community.admin@cherrytwist.org';
  nonEcoverseEmail = 'non-ecoverse@cherrytwist.com';

  async initOrganisation(): Promise<string> {
    const organisation = new CreateOrganisationInput();
    organisation.displayName = `${this.organisationName}`;
    organisation.nameID = `${this.uniqueTextId}`;
    const response = await this.organisationService.createOrganisation(
      organisation
    );
    return response.id;
  }

  async initChallenge(ecoverseId: string): Promise<string> {
    const challenge = new CreateChallengeInput();
    challenge.parentID = ecoverseId;
    challenge.displayName = `${this.challengeName}`;
    challenge.nameID = `${this.uniqueTextId}`;
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

  async initRemoveChallenge(ecoverseId: string): Promise<string> {
    const response = await this.ecoverseService.createChallenge({
      parentID: ecoverseId,
      displayName: 'Remove-challenge',
      nameID: 'remove-chall',
      tags: ['test1', 'test2'],
    });
    return response.id;
  }

  async initChildChallenge(challengeId: string): Promise<string> {
    const opportunity = new CreateChallengeInput();
    opportunity.parentID = challengeId;
    opportunity.displayName = 'init opportunity name';
    opportunity.nameID = 'init-opport';
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
    const response = await this.challengeService.createChildChallenge(
      opportunity
    );
    return response.id;
  }

  async initRemoveChildChallenge(challengeId: string): Promise<string> {
    const opportunity = new CreateChallengeInput();
    opportunity.parentID = challengeId;
    opportunity.displayName = 'init remove opportunity name';
    opportunity.nameID = 'remove-opport';
    const response = await this.challengeService.createChildChallenge(
      opportunity
    );
    return response.id;
  }

  // async initProject(opportunityId: number): Promise<number> {
  //   const project = new CreateProjectInput();
  //   project.name = 'init project name';
  //   project.textID = 'init-project';
  //   project.description = 'init project description';
  //   project.parentID = opportunityId;
  //   // const response = await this.opportunityService.createProject(project);
  //   // return response.id;
  //   return 1;
  // }

  // async initAspect(opportunityId: number): Promise<number> {
  //   const aspect = new CreateAspectInput();
  //   aspect.explanation = 'init aspect explanation';
  //   aspect.framing = 'init aspect framing';
  //   aspect.title = 'init aspect title';
  //   aspect.parentID = opportunityId;
  //   const response = await this.contextService.createAspect(aspect);
  //   return response.id;
  // }

  // async initAspectOnProject(projectId: number): Promise<number> {
  //   const aspect = new CreateAspectInput();
  //   aspect.explanation = 'init project aspect explanation';
  //   aspect.framing = 'init project aspect framing';
  //   aspect.title = 'init project aspect title';
  //   aspect.parentID = projectId;
  //   const response = await this.projectService.createAspect(aspect);
  //   return response.id;
  // }

  // async initRelation(opportunityId: number): Promise<number> {
  //   const relation = new CreateRelationInput();
  //   relation.actorName = 'init relation actor name';
  //   relation.actorRole = 'init relation actor role';
  //   relation.actorType = 'init relation actor type';
  //   relation.description = 'init relation description';
  //   relation.type = 'incoming';
  //   relation.parentID = opportunityId;
  //   // todo: const response = await this.opportunityService.createRelation(relation);
  //   //todo: return response.id;
  //   return 1;
  // }

  // async initAddUserToOpportunity(opportunityId: number): Promise<number> {
  //   const createdTestUser = (await this.userService.getUserByEmail(
  //     this.userEmail
  //   )) as IUser;
  //   const response = await this.communityService.assignMember({
  //     userID: createdTestUser?.id,
  //     communityID: opportunityId,
  //   });
  //   return response.id;
  // }

  // async initCreateGroupOnEcoverse(): Promise<number> {
  //   const ecoverse = await this.ecoverseService.getDefaultEcoverseOrFail({
  //     relations: ['community'],
  //   });
  //   const community = this.ecoverseService.getChallenge(ecoverse).community;
  //   if (!community) throw new Error();
  //   const groupInput = new CreateUserGroupInput();
  //   groupInput.name = this.groupName;
  //   groupInput.parentID = community.id;
  //   const response = await this.communityService.createGroup(groupInput);
  //   return response.id;
  // }

  // async initCreateGroupOnChallenge(challengeId: number): Promise<number> {
  //   const community = await this.challengeService.getCommunity(challengeId);
  //   const groupInput = new CreateUserGroupInput();
  //   groupInput.name = this.groupName;
  //   groupInput.parentID = community.id;
  //   const response = await this.communityService.createGroup(groupInput);
  //   return response.id;
  // }

  // async initActorGroup(opportunityId: number): Promise<number> {
  //   const actorGroup = new CreateActorGroupInput();
  //   actorGroup.name = 'init actorGroup name';
  //   actorGroup.description = 'init actorGroup description';
  //   actorGroup.parentID = opportunityId;
  //   const response = await this.ecosystemModelService.createActorGroup(
  //     actorGroup
  //   );
  //   return response.id;
  // }

  // async initActor(actorGroupId: number): Promise<number> {
  //   const actor = new CreateActorInput();
  //   actor.parentID = actorGroupId;
  //   actor.name = 'init actor name';
  //   actor.impact = 'init actor impact';
  //   actor.value = 'init actor value';
  //   actor.description = 'init actor description';
  //   const response = await this.actorGroupService.createActor(actor);
  //   return response.id;
  // }

  async initGetUserId(userEmail: string): Promise<string> {
    const response = await this.userService.getUserOrFail(userEmail);
    return response.id;
  }

  async initGetUserProfileId(userEmail: string): Promise<any> {
    const response = await this.userService.getUserOrFail(userEmail);
    return response.profile?.id;
  }

  async initGetTagsetId(challengeId: string): Promise<any> {
    const response = await this.challengeService.getChallengeOrFail(
      challengeId
    );
    return response.tagset?.id;
  }

  async initGetContextId(challengeId: string): Promise<any> {
    const response = await this.challengeService.getChallengeOrFail(
      challengeId
    );
    return response.context?.id;
  }

  // async initGetCommunityId(ecoverseId:string): Promise<string> {
  //   const response = await this.communityService.getCommunities(
  //     ecoverseId
  //   );
  //   return response[0].id;
  // }

  async initGetContextIdChildChallenge(opportunityId: string): Promise<any> {
    const response = await this.challengeService.getChallengeOrFail(
      opportunityId
    );
    console.log(response);
    return response.context?.id;
  }

  async teardownChallenges(challengeId: string) {
    const challengeToRemove = (await this.challengeService.getChallengeOrFail(
      challengeId
    )) as IChallenge;
    await this.challengeService.deleteChallenge({
      ID: challengeToRemove?.id,
    });
  }

  // async removeUserFromGroups() {
  //   const response = await this.userService.getUserByEmailOrFail(
  //     this.nonEcoverseEmail
  //   );
  //   await this.userGroupService.removeUser({
  //     userID: response.id,
  //     groupID: 1,
  //   });
  // }

  async initUserId(usersEmail: string): Promise<string> {
    const response = await this.userService.getUserOrFail(usersEmail);
    return response.id;
  }

  async initFunctions(): Promise<TestDataServiceInitResult> {
    const ecoverseId = await this.initEcoverseId();
    // await this.removeUserFromGroups();
    //const communityId = await this.initGetCommunityId(ecoverseId);
    const userProfileId = await this.initGetUserProfileId(this.userEmail);
    const userId = await this.initGetUserId(this.userEmail);
    const organisationId = await this.initOrganisation();
    const challengeId = await this.initChallenge(ecoverseId);
    const removeChallangeId = await this.initRemoveChallenge(ecoverseId);
    const opportunityId = await this.initChildChallenge(challengeId);
    const removeOpportunityId = await this.initRemoveChildChallenge(
      removeChallangeId
    );
    // // const contextIdChildChallenge = await this.initGetContextIdChildChallenge(opportunityId)
    // //const aspectId = await this.initAspect(contextIdChildChallenge);
    // const projectId = await this.initProject(opportunityId);
    // const aspectOnProjectId = await this.initAspectOnProject(projectId);
    // const relationId = await this.initRelation(opportunityId);
    // // const addUserToOpportunityId = await this.initAddUserToOpportunity(
    // //   opportunityId
    // // );
    // const groupIdEcoverse = await this.initCreateGroupOnEcoverse();
    // const createGroupOnChallengeId = await this.initCreateGroupOnChallenge(
    //   challengeId
    // );

    // const actorGroupId = await this.initActorGroup(opportunityId);
    // const actorId = await this.initActor(actorGroupId);
    const tagsetId = await this.initGetTagsetId(challengeId);
    const contextId = await this.initGetContextId(challengeId);
    // const ecoverseAdminId = await this.initUserId(this.ecoverseAdminEmail);
    // const globalAdminId = await this.initUserId(this.globalAdminEmail);
    // const communityAdminId = await this.initUserId(this.communityAdminEmail);
    // const ecoverseMemberId = await this.initUserId(this.ecoverseMemberEmail);
    // const nonEcoverseId = await this.initUserId(this.nonEcoverseEmail);

    // todo: hack to get code compiling
    //const assignGroupFocalPointId = -1;

    return {
      ecoverseId,
      // communityId,
      userId,
      userProfileId,
      organisationId,
      challengeId,
      removeChallangeId,
      opportunityId,
      removeOpportunityId,

      //   projectId,
      //  // aspectId,
      //   //addUserToOpportunityId,
      //   groupIdEcoverse,
      //   aspectOnProjectId,
      //   relationId,
      //   createGroupOnChallengeId,
      //   // assignGroupFocalPointId,
      //   actorGroupId,
      //   actorId,
      tagsetId,
      contextId,
      // ecoverseAdminId,
      // globalAdminId,
      // communityAdminId,
      // ecoverseMemberId,
      // nonEcoverseId,
    };
  }
}
