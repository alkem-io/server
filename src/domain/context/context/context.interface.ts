import { IAspect } from '@domain/context/aspect/aspect.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IEcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.interface';
import { IVisual } from '../visual/visual.interface';

@ObjectType('Context')
export abstract class IContext extends IAuthorizable {
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

  visual?: IVisual;

  aspects?: IAspect[];
}
