import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('Poll')
export abstract class IPoll extends INameable {
  @Field(() => GraphQLJSON, {
    nullable: false,
    description: 'The content of the Poll (e.g. questions, options).',
  })
  content!: any;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the poll voting is anonymous.',
  })
  isAnonymous!: boolean;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Poll content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;

  callout?: ICallout;
}
