import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IWhiteboardCheckout } from '@domain/common/whiteboard-checkout/whiteboard.checkout.interface';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class CheckoutLoaderCreator
  implements DataLoaderCreator<IWhiteboardCheckout>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IWhiteboardCheckout,
      { id: string; checkout?: IWhiteboardCheckout }
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
