import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { ICanvasCheckout } from '@domain/common/canvas-checkout/canvas.checkout.interface';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class CheckoutLoaderCreator
  implements DataLoaderCreator<ICanvasCheckout>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      ICanvasCheckout,
      { id: string; checkout?: ICanvasCheckout }
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      {
        checkout: true,
      },
      this.constructor.name,
      options
    );
  }
}
