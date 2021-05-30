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
import { CreateOpportunityInput } from '@domain/collaboration/opportunity';
import {
  CreateActorGroupInput,
  CreateActorInput,
  CreateAspectInput,
} from '@domain/context';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { CreateProjectInput } from '@domain/collaboration/project';
import { CreateRelationInput } from '@domain/collaboration/relation';

export type TestDataServiceInitResult = {
  ecoverseId: string;
  communityId: string;
  userId: string;
  ecoverseAdminId: string;
  globalAdminId: string;
  communityAdminId: string;
  ecoverseMemberId: string;
  nonEcoverseId: string;
  userProfileId: string;
  organisationId: string;
  challengeId: string;
  removeChallangeId: string;
  opportunityId: string;
  removeOpportunityId: string;
  projectId: string;
  contextIdOpportunity: string;
  aspectId: string;
  aspectOnProjectId: string;
  relationId: string;
  ecosystemModelId: string;
  actorGroupId: string;
  actorId: string;
  tagsetId: string;
};

@Injectable()
export class TestDataService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
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

  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${this.uniqueTextId}`;
  groupName = `testGroup ${this.uniqueTextId}`;
  organisationName = `testOrganisation ${this.uniqueTextId}`;
  avatar = 'https://dev.cherrytwist.org/graphql';
  description = 'TestDescription';
  userEmail = 'qa.user@cherrytwist.org';
  ecoverseMemberEmail = 'ecoverse.member@cherrytwist.org';
  ecoverseAdminEmail = 'ecoverse.admin@cherrytwist.org';
  globalAdminEmail = 'admin@cherrytwist.org';
  communityAdminEmail = 'community.admin@cherrytwist.org';
  nonEcoverseEmail = 'non.ecoverse@cherrytwist.org';
  testEcoverseNameId = 'TestEcoverse';

  async initCreateEcoverse(): Promise<string> {
    const ecoverse = new CreateEcoverseInput();
    ecoverse.nameID = this.testEcoverseNameId;
    ecoverse.displayName = this.testEcoverseNameId;
    ecoverse.context = {
      background: 'test ecoverse background',
      impact: 'test ecoverse impact',
      references: [
        {
          name: 'test ref ecoverse name',
          uri: 'https://test_ref_ecoverse_uri.com',
          description: 'test ref ecoverse description',
        },
      ],
      tagline: 'test ecoverse tagline',
      vision: 'test ecoverse vision',
      who: 'test ecoverse who',
    };
    ecoverse.tags = ['ecoverseTest1', 'ecoverseTest2'];
    const response = await this.ecoverseService.createEcoverse(ecoverse);
    return response.id;
  }

  async initGetCommunity(): Promise<string> {
    const response = await this.ecoverseService.getEcoverseOrFail(
      this.testEcoverseNameId,
      {
        relations: ['community'],
      }
    );
    return response.community?.id as string;
  }

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

  async initCreateOpportunity(challengeId: string): Promise<string> {
    const opportunity = new CreateOpportunityInput();
    opportunity.challengeID = challengeId;
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
    const response = await this.challengeService.createOpportunity(opportunity);
    return response.id;
  }

  async initRemoveOpportunity(challengeId: string): Promise<string> {
    const opportunity = new CreateOpportunityInput();
    opportunity.challengeID = challengeId;
    opportunity.displayName = 'init remove opportunity name';
    opportunity.nameID = 'remove-opport';
    const response = await this.challengeService.createOpportunity(opportunity);
    return response.id;
  }

  async initProject(opportunityId: string): Promise<string> {
    const project = new CreateProjectInput();
    project.opportunityID = opportunityId;
    project.displayName = 'init project name';
    project.nameID = 'init-project';
    project.description = 'init project description';
    const response = await this.opportunityService.createProject(project);
    return response.id;
  }

  async initAspect(contextId: string): Promise<string> {
    const aspect = new CreateAspectInput();
    aspect.parentID = contextId;
    aspect.explanation = 'init aspect explanation';
    aspect.framing = 'init aspect framing';
    aspect.title = 'init aspect title';
    const response = await this.contextService.createAspect(aspect);
    return response.id;
  }

  async initAspectOnProject(projectId: string): Promise<string> {
    const aspect = new CreateAspectInput();
    aspect.parentID = projectId;
    aspect.explanation = 'init project aspect explanation';
    aspect.framing = 'init project aspect framing';
    aspect.title = 'init project aspect title';
    const response = await this.projectService.createAspect(aspect);
    return response.id;
  }

  async initRelation(opportunityId: string): Promise<string> {
    const relation = new CreateRelationInput();
    relation.parentID = opportunityId;
    relation.actorName = 'init relation actor name';
    relation.actorRole = 'init relation actor role';
    relation.actorType = 'init relation actor type';
    relation.description = 'init relation description';
    relation.type = 'incoming';
    const response = await this.opportunityService.createRelation(relation);
    return response.id;
  }

  async initActorGroup(ecosystemModelId: string): Promise<string> {
    const actorGroup = new CreateActorGroupInput();
    actorGroup.ecosystemModelID = ecosystemModelId;
    actorGroup.name = 'init actorGroup name';
    actorGroup.description = 'init actorGroup description';
    const response = await this.ecosystemModelService.createActorGroup(
      actorGroup
    );
    return response.id;
  }

  async initActor(actorGroupId: string): Promise<string> {
    const actor = new CreateActorInput();
    actor.actorGroupID = actorGroupId;
    actor.name = 'init actor name';
    actor.impact = 'init actor impact';
    actor.value = 'init actor value';
    actor.description = 'init actor description';
    const response = await this.actorGroupService.createActor(actor);
    return response.id;
  }

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

  async initGetCommunityId(ecoverseId: string): Promise<string> {
    const response = await this.communityService.getCommunityOrFail(ecoverseId);
    return response.id;
  }

  async initGetOpportunityContextId(contextId: string): Promise<string> {
    const response = await this.opportunityService.getContext(contextId);
    return response.id;
  }

  async initGetEcosystemModelId(contextIdOpportunity: string): Promise<string> {
    const response = await this.contextService.getContextOrFail(
      contextIdOpportunity,
      {
        relations: ['ecosystemModel'],
      }
    );
    return response.ecosystemModel?.id as string;
  }

  async teardownChallenges(challengeId: string) {
    const challengeToRemove = (await this.challengeService.getChallengeOrFail(
      challengeId
    )) as IChallenge;
    await this.challengeService.deleteChallenge({
      ID: challengeToRemove?.id,
    });
  }

  async initUserId(usersEmail: string): Promise<string> {
    const response = await this.userService.getUserOrFail(usersEmail);
    return response.id;
  }

  async initFunctions(): Promise<TestDataServiceInitResult> {
    const ecoverseId = await this.initCreateEcoverse();
    const communityId = await this.initGetCommunity();
    const userProfileId = await this.initGetUserProfileId(this.userEmail);
    const userId = await this.initGetUserId(this.userEmail);
    const organisationId = await this.initOrganisation();
    const challengeId = await this.initChallenge(ecoverseId);
    const removeChallangeId = await this.initRemoveChallenge(ecoverseId);
    const opportunityId = await this.initCreateOpportunity(challengeId);
    const removeOpportunityId = await this.initRemoveOpportunity(challengeId);
    const contextIdOpportunity = await this.initGetOpportunityContextId(
      opportunityId
    );
    const aspectId = await this.initAspect(contextIdOpportunity);
    const projectId = await this.initProject(opportunityId);
    const aspectOnProjectId = await this.initAspectOnProject(projectId);
    const relationId = await this.initRelation(opportunityId);
    const ecosystemModelId = await this.initGetEcosystemModelId(
      contextIdOpportunity
    );
    const actorGroupId = await this.initActorGroup(ecosystemModelId);
    const actorId = await this.initActor(actorGroupId);
    const tagsetId = await this.initGetTagsetId(challengeId);
    const ecoverseAdminId = await this.initUserId(this.ecoverseAdminEmail);
    const globalAdminId = await this.initUserId(this.globalAdminEmail);
    const communityAdminId = await this.initUserId(this.communityAdminEmail);
    const ecoverseMemberId = await this.initUserId(this.ecoverseMemberEmail);
    const nonEcoverseId = await this.initUserId(this.nonEcoverseEmail);

    return {
      ecoverseId,
      communityId,
      userId,
      userProfileId,
      organisationId,
      challengeId,
      removeChallangeId,
      opportunityId,
      removeOpportunityId,
      contextIdOpportunity,
      projectId,
      aspectId,
      aspectOnProjectId,
      relationId,
      ecosystemModelId,
      actorGroupId,
      actorId,
      tagsetId,
      ecoverseAdminId,
      globalAdminId,
      communityAdminId,
      ecoverseMemberId,
      nonEcoverseId,
    };
  }
}
