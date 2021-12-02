import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { IAuthorizable } from '../entity/authorizable-entity';
@ObjectType('Canvas')
export abstract class ICanvas extends IAuthorizable {
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
