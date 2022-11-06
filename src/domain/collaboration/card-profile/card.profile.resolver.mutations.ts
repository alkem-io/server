import { IReference } from '@domain/common/reference';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateCardProfileInput } from './dto';
import { CardProfileService } from './card.profile.service';
import { CreateReferenceOnCardProfileInput } from './dto/card.profile.dto.create.reference';
import { ICardProfile } from './card.profile.interface';

@Resolver()
export class CardProfileResolverMutations {
  constructor(
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private cardProfileService: CardProfileService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified CardProfile.',
  })
  @Profiling.api
  async createReferenceOnCardProfile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceData') referenceInput: CreateReferenceOnCardProfileInput
  ): Promise<IReference> {
    const cardProfile = await this.cardProfileService.getCardProfileOrFail(
      referenceInput.cardProfileID,
      {
        relations: ['references'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      cardProfile.authorization,
      AuthorizationPrivilege.CREATE,
      `cardProfile: ${cardProfile.id}`
    );
    const reference = await this.cardProfileService.createReference(
      referenceInput
    );
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        cardProfile.authorization
      );
    return await this.referenceService.saveReference(reference);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICardProfile, {
    description: 'Updates the specified CardProfile.',
  })
  @Profiling.api
  async updateCardProfile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('cardProfileData') cardProfileData: UpdateCardProfileInput
  ): Promise<ICardProfile> {
    const cardProfile = await this.cardProfileService.getCardProfileOrFail(
      cardProfileData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      cardProfile.authorization,
      AuthorizationPrivilege.UPDATE,
      `cardProfile: ${cardProfile.id}`
    );
    return await this.cardProfileService.updateCardProfile(cardProfileData);
  }
}
