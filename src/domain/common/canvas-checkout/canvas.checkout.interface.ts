import { Field, ObjectType } from '@nestjs/graphql';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UUID } from '../scalars/scalar.uuid';

@ObjectType('CanvasCheckout')
export abstract class ICanvasCheckout extends IAuthorizable {
  canvasID!: string;

  @Field(() => UUID, {
    description: 'The id of the user that has checked the entity out.',
  })
  lockedBy!: string;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle?: ILifecycle;
}
