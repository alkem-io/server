import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PostService } from './post.service';
import { DeletePostInput } from '@domain/collaboration/post/dto/post.dto.delete';
import { UpdatePostInput } from '@domain/collaboration/post/dto/post.dto.update';
import { IPost } from '@domain/collaboration/post/post.interface';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';

@Resolver()
export class PostResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private postService: PostService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPost, {
    description: 'Deletes the specified Post.',
  })
  async deletePost(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeletePostInput
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      post.authorization,
      AuthorizationPrivilege.DELETE,
      `delete post: ${post.nameID}`
    );
    return await this.postService.deletePost(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
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
      `update post: ${post.nameID}`
    );
    return await this.postService.updatePost(postData);
  }
}
