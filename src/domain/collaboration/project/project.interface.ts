import { IAgreement } from '@domain/collaboration/agreement';
import { IAspect } from '@domain/context/aspect';
import { ITagset } from '@domain/common/tagset';
import { ILifecycle } from '@domain/common/lifecycle';
import { Field, ObjectType } from '@nestjs/graphql';
import { IIdentifiable } from '@domain/common/identifiable-entity';

@ObjectType('Project')
export abstract class IProject extends IIdentifiable {
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
