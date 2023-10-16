import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { IPost } from '../post/post.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  link?: IReference;

  whiteboard?: IWhiteboard;

  post?: IPost;

  createdBy?: string;
}
