import { IAspect, IEcosystemModel } from '@domain/context';
import { IReference } from '@domain/common/reference';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Context')
export abstract class IContext extends IBaseCherrytwist {
  @Field(() => String, {
    nullable: true,
    description: 'A one line description',
  })
  tagline?: string;

  @Field(() => String, {
    nullable: true,
    description: 'A detailed description of the current situation',
  })
  background?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  vision?: string;

  @Field(() => String, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  impact?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  who?: string;

  @Field(() => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  references?: IReference[];

  ecosystemModel?: IEcosystemModel;

  aspects?: IAspect[];
}
