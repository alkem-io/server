import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { InputCreatorQueryResults } from './dto/input.creator.query.results';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { InputCreatorService } from './input.creator.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';

@Resolver(() => InputCreatorQueryResults)
export class InputCreatorResolverFields {
  constructor(
    private inputCreatorService: InputCreatorService,
    private authorizationService: AuthorizationService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => CreateCommunityGuidelinesInput, {
    nullable: true,
    description: 'Create an input based on the provided Community Guidelines',
  })
  async communityGuidelines(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateCommunityGuidelinesInput> {
    const guidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      guidelines.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator Community guidelines: ${guidelines.id}`
    );

    return await this.inputCreatorService.buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
      guidelines
    );
  }

  // @ResolveField('innovationFlowInput', () => CreateInnovationFlowInput, {
  //   nullable: true,
  //   description:
  //     'Craete the input for a new Innovation Flow based on the supplied Template.',
  // })
  // async innovationFlowInput(
  //   @Parent() template: ITemplate
  // ): Promise<CreateInnovationFlowInput | undefined> {
  //   if (template.type !== TemplateType.INNOVATION_FLOW) {
  //     return undefined;
  //   }
  //   const innovationFlow = await this.templateService.getInnovationFlow(
  //     template.id
  //   );
  //   return this.inputCreatorService.buildCreateInnovationFlowInputFromInnovationFlow(
  //     innovationFlow
  //   );
  // }

  // @ResolveField('calloutInput', () => CreateCalloutInput, {
  //   nullable: true,
  //   description:
  //     'Build the input for creating a new Callout from this Template.',
  // })
  // async calloutInput(
  //   @Parent() template: ITemplate
  // ): Promise<CreateCalloutInput | undefined> {
  //   if (template.type !== TemplateType.CALLOUT) {
  //     return undefined;
  //   }
  //   const callout = await this.templateService.getCallout(template.id);
  //   return this.inputCreatorService.buildCreateCalloutInputFromCallout(
  //     callout
  //   );
  // }
}
