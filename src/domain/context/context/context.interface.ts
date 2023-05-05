import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IEcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('Context')
export abstract class IContext extends IAuthorizable {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  vision?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  impact?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  who?: string;

  ecosystemModel?: IEcosystemModel;
}
