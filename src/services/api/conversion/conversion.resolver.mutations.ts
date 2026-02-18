import { GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS } from '@common/constants/authorization/global.policy.constants';
import { LogContext } from '@common/enums';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutTransferService } from '@domain/collaboration/callout-transfer/callout.transfer.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversionService } from './conversion.service';
import { ConversionVcSpaceToVcKnowledgeBaseInput } from './dto/conversion.dto.vc.space.to.vc.kb';
import { ConvertSpaceL1ToSpaceL0Input } from './dto/convert.dto.space.l1.to.space.l0.input';
import { ConvertSpaceL1ToSpaceL2Input } from './dto/convert.dto.space.l1.to.space.l2.input';
import { ConvertSpaceL2ToSpaceL1Input } from './dto/convert.dto.space.l2.to.space.l1.input';

@InstrumentResolver()
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

  @Mutation(() => ISpace, {
    description: 'Move an L1 Space up in the hierarchy, to be a L0 Space.',
  })
  async convertSpaceL1ToSpaceL0(
    @CurrentActor() actorContext: ActorContext,
    @Args('convertData')
    conversionData: ConvertSpaceL1ToSpaceL0Input
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert challenge to space: ${actorContext.actorId}`
    );
    let space =
      await this.conversionService.convertSpaceL1ToSpaceL0OrFail(
        conversionData
      );
    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description: 'Move an L2 Space up in the hierarchy, to be a L1 Space.',
  })
  async convertSpaceL2ToSpaceL1(
    @CurrentActor() actorContext: ActorContext,
    @Args('convertData')
    conversionData: ConvertSpaceL2ToSpaceL1Input
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert space L2 to Space L1: ${actorContext.actorId}`
    );
    let spaceL1 =
      await this.conversionService.convertSpaceL2ToSpaceL1OrFail(
        conversionData
      );
    spaceL1 = await this.spaceService.save(spaceL1);

    const parentAuthorization = await this.getParentSpaceAuthorization(
      spaceL1.id
    );
    const spaceL1Authorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        spaceL1.id,
        parentAuthorization
      );
    await this.authorizationPolicyService.saveAll(spaceL1Authorizations);
    return await this.spaceService.getSpaceOrFail(spaceL1.id);
  }

  @Mutation(() => ISpace, {
    description:
      'Move an L1 Space down in the hierarchy within the same L0 Space, to be a L2 Space. \
      Restrictions: the Space L1 must remain within the same L0 Space. \
      Roles: all user, organization and virtual contributor role assignments are removed, with \
      the exception of Admin role assignments for Users.',
  })
  async convertSpaceL1ToSpaceL2(
    @CurrentActor() actorContext: ActorContext,
    @Args('convertData')
    conversionData: ConvertSpaceL1ToSpaceL2Input
  ): Promise<ISpace> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert space L1 to Space L2: ${actorContext.actorId}`
    );
    let spaceL2 =
      await this.conversionService.convertSpaceL1ToSpaceL2OrFail(
        conversionData
      );
    spaceL2 = await this.spaceService.save(spaceL2);

    const parentAuthorization = await this.getParentSpaceAuthorization(
      spaceL2.id
    );
    const spaceL1Authorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        spaceL2.id,
        parentAuthorization
      );
    await this.authorizationPolicyService.saveAll(spaceL1Authorizations);
    return await this.spaceService.getSpaceOrFail(spaceL2.id);
  }

  @Mutation(() => IVirtualContributor, {
    description:
      'Convert a VC of type ALKEMIO_SPACE to be of type KNOWLEDGE_BASE. All Callouts from the Space currently being used are moved to the Knowledge Base. Note: only allowed for VCs using a Space within the same Account.',
  })
  async convertVirtualContributorToUseKnowledgeBase(
    @CurrentActor() actorContext: ActorContext,
    @Args('conversionData')
    conversionData: ConversionVcSpaceToVcKnowledgeBaseInput
  ): Promise<IVirtualContributor> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `convert VC of type Space to VC of type KnowledgeBase: ${actorContext.actorId}`
    );
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        conversionData.virtualContributorID,
        {
          relations: {
            account: true,
            knowledgeBase: {
              calloutsSet: true,
            },
          },
        }
      );
    if (
      !virtualContributor.knowledgeBase ||
      !virtualContributor.knowledgeBase.calloutsSet ||
      !virtualContributor.account
    ) {
      throw new RelationshipNotFoundException(
        `Missing entities on Virtual Contributor when converting to KnowledgeBase: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }

    const vcType = virtualContributor.bodyOfKnowledgeType;

    if (vcType !== VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE) {
      throw new ValidationException(
        `Virtual Contributor is not of type Space: ${virtualContributor.id}`,
        LogContext.CONVERSION
      );
    }
    const spaceID = virtualContributor.bodyOfKnowledgeID;
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
        actorContext
      );
    }

    // Reset the authorization policy for the callout
    const authorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.virtualContributorService.getVirtualContributorByIdOrFail(
      virtualContributor.id
    );
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
}
