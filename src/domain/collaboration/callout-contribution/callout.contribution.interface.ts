import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IPost } from '../post/post.interface';
import { ILink } from '../link/link.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  link?: ILink;

  whiteboard?: IWhiteboard;

  post?: IPost;

  createdBy?: string;
}
