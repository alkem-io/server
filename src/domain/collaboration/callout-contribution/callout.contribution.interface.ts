import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { IPost } from '../post/post.interface';
import { ICallout } from '../callout/callout.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  link?: IReference;

  whiteboard?: IWhiteboard;

  post?: IPost;

  createdBy?: string;

  @Field(() => ICallout, {
    nullable: true,
    description: 'The parent Callout of the Contribution',
  })
  callout?: ICallout;
}
