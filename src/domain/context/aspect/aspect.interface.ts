import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Aspect')
export abstract class IAspect extends IBaseCherrytwist {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  framing!: string;

  @Field(() => String)
  explanation!: string;
}
