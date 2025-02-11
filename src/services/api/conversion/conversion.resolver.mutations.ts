import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversionService } from './conversion.service';
import { ISpace } from '@domain/space/space/space.interface';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConvertSubspaceToSpaceInput } from './dto/convert.dto.subspace.to.space.input';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { ConvertSubsubspaceToSubspaceInput } from './dto/convert.dto.subsubspace.to.subspace.input';
import { SpaceService } from '@domain/space/space/space.service';
import { GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS } from '@common/constants/authorization/global.policy.constants';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { ConversionVcSpaceToVcKnowledgeBaseInput } from './dto/conversion.dto.vc.space.to.vc.kb';
import { CalloutTransferService } from '@domain/collaboration/callout-transfer/callout.transfer.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';

@Resolver()
export class ConversionResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversionService: ConversionService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private spaceService: SpaceService,
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private calloutTransferService: CalloutTransferService,
    private aiServerAdapter: AiServerAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Creates a new Space by converting an existing Challenge.',
  })
  @Profiling.api
  async convertChallengeToSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData')
    convertChallengeToSpaceData: ConvertSubspaceToSpaceInput
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert challenge to space: ${agentInfo.email}`
    );
    let space = await this.conversionService.convertChallengeToSpaceOrFail(
      convertChallengeToSpaceData,
      agentInfo
    );
    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description:
      'Creates a new Challenge by converting an existing Opportunity.',
  })
  @Profiling.api
  async convertOpportunityToChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('convertData')
    convertOpportunityToChallengeData: ConvertSubsubspaceToSubspaceInput
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.CREATE,
      `convert opportunity to challenge: ${agentInfo.email}`
    );
    let subspace =
      await this.conversionService.convertOpportunityToChallengeOrFail(
        convertOpportunityToChallengeData.subsubspaceID,
        agentInfo
      );
    subspace = await this.spaceService.save(subspace);

    const parentAuthorization = await this.getParentSpaceAuthorization(
      subspace.id
    );
    const subspaceAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        subspace.id,
        parentAuthorization
      );
    await this.authorizationPolicyService.saveAll(subspaceAuthorizations);
    return await this.spaceService.getSpaceOrFail(subspace.id);
  }

  private async getParentSpaceAuthorization(
    subspaceID: string
  ): Promise<IAuthorizationPolicy | never> {
    const subspace = await this.spaceService.getSpaceOrFail(subspaceID, {
      relations: {
        parentSpace: {
          authorization: true,
        },
      },
    });
    if (!subspace.parentSpace || !subspace.parentSpace.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load parent space authorization for subspace: ${subspaceID}`,
        LogContext.CONVERSION
      );
    }
    return subspace.parentSpace.authorization;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description:
      'Convert a VC of type ALKEMIO_SPACE to be of type KNOWLEDGE_BASE. All Callouts from the Space currently being used are moved to the Knowledge Base. Note: only allowed for VCs using a Space within the same Account.',
  })
  async convertVirtualContributorToUseKnowledgeBase(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversionData')
    conversionData: ConversionVcSpaceToVcKnowledgeBaseInput
  ): Promise<IVirtualContributor> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert VC of type Space to VC of type KnowledgeBase: ${agentInfo.email}`
    );
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        conversionData.virtualContributorID,
        {
          relations: {
            account: true,
            knowledgeBase: {
              calloutsSet: true,
            },
            aiPersona: true,
          },
        }
      );
    if (
      !virtualContributor.knowledgeBase ||
      !virtualContributor.knowledgeBase.calloutsSet ||
      !virtualContributor.account ||
      !virtualContributor.aiPersona
    ) {
      throw new RelationshipNotFoundException(
        `Missing entities on Virtual Contributor when converting to KnowledgeBase: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }

    const aiPersona =
      await this.virtualContributorService.getAiPersonaOrFail(
        virtualContributor
      );

    const vcType =
      await this.aiServerAdapter.getPersonaServiceBodyOfKnowledgeType(
        aiPersona.aiPersonaServiceID
      );

    if (vcType !== AiPersonaBodyOfKnowledgeType.ALKEMIO_SPACE) {
      throw new ValidationException(
        `Virtual Contributor is not of type Space: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }
    const spaceID =
      await this.aiServerAdapter.getPersonaServiceBodyOfKnowledgeID(
        aiPersona.aiPersonaServiceID
      );
    if (!spaceID) {
      throw new ValidationException(
        `Virtual Contributor does not have a body of knowledge: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }

    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        collaboration: {
          calloutsSet: {
            callouts: true,
          },
        },
      },
    });

    if (
      !space.collaboration ||
      !space.collaboration.calloutsSet ||
      !space.collaboration.calloutsSet.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Missing entities on space when converting VC to KnowledgeBase: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }

    const spaceAccount =
      await this.spaceService.getAccountForLevelZeroSpaceOrFail(space);

    if (virtualContributor.account.id !== spaceAccount.id) {
      throw new ValidationException(
        `Virtual Contributor and Space do not belong to the same account: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }

    const sourceCalloutsSet = space.collaboration?.calloutsSet;
    if (!sourceCalloutsSet) {
      throw new RelationshipNotFoundException(
        `Unable to load CalloutsSet on Space:  ${virtualContributor.id} `,
        LogContext.CONVERSION
      );
    }
    const targetCalloutsSet = virtualContributor.knowledgeBase.calloutsSet;

    // Transfer is authorized, now try to execute it
    for (const callout of space.collaboration.calloutsSet.callouts) {
      await this.calloutTransferService.transferCallout(
        callout,
        targetCalloutsSet,
        agentInfo
      );
    }

    // Update the information on the AI Persona Service
    await this.aiServerAdapter.updateAiPersonaService({
      ID: virtualContributor.aiPersona.aiPersonaServiceID,
      bodyOfKnowledgeType: AiPersonaBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE,
      bodyOfKnowledgeID: virtualContributor.knowledgeBase.id,
    });

    // Reset the authorization policy for the callout
    const authorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.virtualContributorService.getVirtualContributorOrFail(
      virtualContributor.id
    );
  }
}
