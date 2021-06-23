import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Aspect')
export abstract class IAspect extends IAuthorizable {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  framing!: string;

  @Field(() => String)
  explanation!: string;
}
