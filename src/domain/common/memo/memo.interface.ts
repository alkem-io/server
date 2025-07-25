import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { MemoContent } from '../scalars/scalar.memo.content';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@ObjectType('Memo')
export abstract class IMemo extends INameable {
  @Field(() => MemoContent, {
    nullable: false,
    description: 'The visual content of the Memo.',
  })
  content!: string;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Memo content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;

  callout?: ICallout;
}
