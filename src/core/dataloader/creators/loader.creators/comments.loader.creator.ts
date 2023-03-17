import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IComments } from '@domain/communication/comments/comments.interface';
import { Comments } from '@domain/communication/comments';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class CommentsLoaderCreator implements DataLoaderCreator<IComments> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IComments,
      { id: string; comments?: Comments }
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
      { comments: true },
      this.constructor.name,
      options
    );
  }
}
