import { IAgreement } from '@domain/collaboration/agreement';
import { IAspect } from '@domain/context/aspect';
import { ITagset } from '@domain/common/tagset';
import { ILifecycle } from '@domain/common/lifecycle';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Project')
export abstract class IProject extends IBaseCherrytwist {
  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Opportunity',
  })
  textID!: string;

  @Field(() => String, { nullable: false, description: '' })
  name!: string;

  @Field(() => String, { nullable: true, description: '' })
  description?: string;

  lifecycle?: ILifecycle;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the project',
  })
  tagset?: ITagset;

  agreements?: IAgreement[];

  @Field(() => [IAspect], {
    nullable: true,
    description: 'The set of aspects for this Project. Note: likley to change.',
  })
  aspects?: IAspect[];
}
