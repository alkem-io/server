import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '../callout/callout.interface';
import { ILink } from '../link/link.interface';
import { IPost } from '../post/post.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  type!: CalloutContributionType;

  link?: ILink;

  whiteboard?: IWhiteboard;

  post?: IPost;

  memo?: IMemo;

  createdBy?: string;

  callout?: ICallout;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Contribution.',
  })
  sortOrder!: number;
}
