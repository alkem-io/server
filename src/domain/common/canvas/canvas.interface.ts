import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
@ObjectType('Canvas')
export abstract class ICanvas extends IBaseAlkemio {
  @Field(() => String, {
    description: 'The name of the Canvas.',
  })
  name!: string;

  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;

  @Field(() => ICanvasCheckout, {
    description: 'The checked out status of the Canvas.',
  })
  checkout?: ICanvasCheckout;
}
