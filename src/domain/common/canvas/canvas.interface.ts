import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { INameable } from '../entity/nameable-entity';
import { IVisual } from '@domain/common/visual/visual.interface';

@ObjectType('Canvas')
export abstract class ICanvas extends INameable {
  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;

  @Field(() => IVisual, {
    description: 'The preview image for the Canvas.',
    nullable: true,
  })
  preview?: IVisual;

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  checkout?: ICanvasCheckout;
}
