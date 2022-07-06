import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { INameable } from '../entity/nameable-entity';
@ObjectType('Canvas')
export abstract class ICanvas extends INameable {
  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;

  @Field(() => Boolean, {
    description: 'Is the Canvas a template?',
  })
  isTemplate!: boolean;

  checkout?: ICanvasCheckout;
}
