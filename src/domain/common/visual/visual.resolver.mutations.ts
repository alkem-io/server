import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VisualService } from './visual.service';
import { IVisual } from './visual.interface';
import { UpdateVisualInput } from './dto/visual.dto.update';

@Resolver()
export class VisualResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private visualService: VisualService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVisual, {
    description: 'Updates the image URI for the specified Visual.',
  })
  async updateVisual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateVisualInput
  ): Promise<IVisual> {
    const visual = await this.visualService.getVisualOrFail(
      updateData.visualID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image update: ${visual.id}`
    );
    return await this.visualService.updateVisual(updateData);
  }
}
