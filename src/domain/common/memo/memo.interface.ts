import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@ObjectType('Memo')
export abstract class IMemo extends INameable {
  content?: Buffer;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Memo content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;
}
