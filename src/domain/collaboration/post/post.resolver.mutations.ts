import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeletePostInput } from '@domain/collaboration/post/dto/post.dto.delete';
import { UpdatePostInput } from '@domain/collaboration/post/dto/post.dto.update';
import { IPost } from '@domain/collaboration/post/post.interface';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PostService } from './post.service';

@InstrumentResolver()
@Resolver()
export class PostResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private postService: PostService
  ) {}

  @Mutation(() => IPost, {
    description: 'Deletes the specified Post.',
  })
  async deletePost(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeletePostInput
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(deleteData.ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      post.authorization,
      AuthorizationPrivilege.DELETE,
      `delete post: ${post.id}`
    );
    return this.postService.deletePost(deleteData.ID);
  }

  @Mutation(() => IPost, {
    description: 'Updates the specified Post.',
  })
  async updatePost(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('postData') postData: UpdatePostInput
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(postData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      post.authorization,
      AuthorizationPrivilege.UPDATE,
      `update post: ${post.id}`
    );
    return await this.postService.updatePost(postData);
  }
}
