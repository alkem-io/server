import { IAgreement } from '@domain/collaboration/agreement/agreement.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameableOld } from '@domain/common/entity/nameable-entity';

@ObjectType('Project')
export abstract class IProject extends INameableOld {
  @Field(() => String, { nullable: true, description: '' })
  description?: string;

  lifecycle?: ILifecycle;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the project',
  })
  tagset?: ITagset;

  agreements?: IAgreement[];

  hubID!: string;
}
