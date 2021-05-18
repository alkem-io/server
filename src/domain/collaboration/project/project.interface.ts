import { IAgreement } from '@domain/collaboration/agreement/agreement.interface';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILifecycle } from '@domain/common/lifecycle';
import { IBaseCherrytwist, Tagset } from '@domain/common';
import { Field, ObjectType } from '@nestjs/graphql';
import { Aspect } from '@domain/context/aspect';

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

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the project',
  })
  tagset?: ITagset;

  agreements?: IAgreement[];

  @Field(() => [Aspect], {
    nullable: true,
    description: 'The set of aspects for this Project. Note: likley to change.',
  })
  aspects?: IAspect[];
}
