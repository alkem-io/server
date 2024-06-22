import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PostTemplateService } from './post.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IPostTemplate } from './post.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UpdatePostTemplateInput } from './dto/post.template.dto.update';
import { DeletePostTemplateInput } from './dto/post.template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class PostTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private postTemplateService: PostTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPostTemplate, {
    description: 'Updates the specified PostTemplate.',
  })
  async updatePostTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('postTemplateInput')
    postTemplateInput: UpdatePostTemplateInput
  ): Promise<IPostTemplate> {
    const postTemplate = await this.postTemplateService.getPostTemplateOrFail(
      postTemplateInput.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      postTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update post template: ${postTemplate.id}`
    );
    return await this.postTemplateService.updatePostTemplate(
      postTemplate,
      postTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPostTemplate, {
    description: 'Deletes the specified PostTemplate.',
  })
  async deletePostTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeletePostTemplateInput
  ): Promise<IPostTemplate> {
    const postTemplate = await this.postTemplateService.getPostTemplateOrFail(
      deleteData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      postTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `post template delete: ${postTemplate.id}`
    );
    return await this.postTemplateService.deletePostTemplate(postTemplate);
  }
}
