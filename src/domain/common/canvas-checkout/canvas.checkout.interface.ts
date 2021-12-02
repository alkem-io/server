import { Field, ObjectType } from '@nestjs/graphql';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';

@ObjectType('CanvasCheckout')
export abstract class ICanvasCheckout extends IAuthorizable {
  canvasCheckoutID!: string;

  @Field(() => CanvasCheckoutStateEnum, {
    description: 'Checked out status of the Canvas',
  })
  status!: string;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle?: ILifecycle;
}
