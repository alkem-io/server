import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LinkService } from './link.service';
import { UpdateLinkInput } from '@domain/collaboration/link/dto/link.dto.update';
import { DeleteLinkInput } from '@domain/collaboration/link/dto/link.dto.delete';
import { ILink } from '@domain/collaboration/link/link.interface';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';

@Resolver()
export class LinkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private linkService: LinkService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILink, {
    description: 'Deletes the specified Link.',
  })
  async deleteLink(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      link.authorization,
      AuthorizationPrivilege.DELETE,
      `delete link: ${link.id}`
    );
    return await this.linkService.deleteLink(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILink, {
    description: 'Updates the specified Link.',
  })
  async updateLink(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('linkData') linkData: UpdateLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(linkData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      link.authorization,
      AuthorizationPrivilege.UPDATE,
      `update link: ${link.id}`
    );
    return await this.linkService.updateLink(linkData);
  }
}
