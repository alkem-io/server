import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('Memo')
export abstract class IMemo extends INameable {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The content of the Memo.',
  })
  content?: string;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Memo content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;

  callout?: ICallout;
}
