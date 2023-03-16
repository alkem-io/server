import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { INameableOld } from '../entity/nameable-entity';
import { IVisual } from '@domain/common/visual/visual.interface';

@ObjectType('Canvas')
export abstract class ICanvas extends INameableOld {
  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;

  preview?: IVisual;

  // Expose the date at which the Canvas was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  checkout?: ICanvasCheckout;
}
