import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('Visual')
export abstract class IVisual extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  uri!: string;

  @Field(() => Number, {
    description: 'Minimum width resolution.',
  })
  minWidth!: number;

  @Field(() => Number, {
    description: 'Maximum width resolution.',
  })
  maxWidth!: number;

  @Field(() => Number, {
    description: 'Minimum height resolution.',
  })
  minHeight!: number;

  @Field(() => Number, {
    description: 'Maximum height resolution.',
  })
  maxHeight!: number;

  @Field(() => Number, {
    description: 'Post ratio width / height.',
  })
  aspectRatio!: number;

  @Field(() => [String])
  allowedTypes!: string[];

  @Field(() => String, { nullable: true })
  alternativeText?: string;
}
