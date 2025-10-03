import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IPost } from '../post/post.interface';
import { ILink } from '../link/link.interface';
import { ICallout } from '../callout/callout.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  link?: ILink;

  whiteboard?: IWhiteboard;

  post?: IPost;

  createdBy?: string;

  callout?: ICallout;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Contribution.',
  })
  sortOrder!: number;
}
