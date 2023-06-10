import { LogContext } from '@common/enums';
import { CalloutType } from '@common/enums/callout.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, IPost } from '.';
import { Callout } from '../callout';
import { PostService } from './post.service';

@Injectable()
export class PostMoveService {
  constructor(
    private postService: PostService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async movePostToCallout(
    postID: string,
    calloutID: string
  ): Promise<IPost> {
    const post = await this.postService.getPostOrFail(postID, {
      relations: ['callout', 'callout.collaboration'],
    });

    const sourceCallout = post.callout as Callout;
    const targetCallout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      relations: ['collaboration'],
    });

    if (!targetCallout) {
      throw new EntityNotFoundException(
        `Target Callout ${calloutID} not found.`,
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.type !== CalloutType.CARD) {
      throw new NotSupportedException(
        'A Post can be moved to a callout of type CARD only.',
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.collaboration?.id !== sourceCallout?.collaboration?.id) {
      throw new NotSupportedException(
        'A Post can only be moved between Callouts in the same Collaboration.',
        LogContext.COLLABORATION
      );
    }

    post.callout = targetCallout;

    await this.postRepository.save(post);

    const movedPost = await this.postService.getPostOrFail(postID, {
      relations: ['callout'],
    });

    return movedPost;
  }
}
