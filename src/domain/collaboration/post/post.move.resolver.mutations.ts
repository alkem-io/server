import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PostService } from './post.service';
import { IPost } from '@domain/collaboration/post';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { MovePostInput } from '@domain/collaboration/post/dto/post.dto.move';
import { PostMoveService } from './post.move.service';

@Resolver()
export class PostMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private postMoveService: PostMoveService,
    private postService: PostService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPost, {
    description: 'Moves the specified Post to another Callout.',
  })
  async movePostToCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('movePostData') movePostData: MovePostInput
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(movePostData.postID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      post.authorization,
      AuthorizationPrivilege.MOVE_POST,
      `move post: ${post.nameID}`
    );
    return await this.postMoveService.movePostToCallout(
      movePostData.postID,
      movePostData.calloutID
    );
  }
}
