import { ContextId } from '@nestjs/core';
import { Type } from '@nestjs/common';
import { DataLoaderCreator } from '../data.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';

export interface DataLoaderContextEntry {
  contextId: ContextId;
  get: <TReturn>(
    creatorRef: Type<DataLoaderCreator<TReturn>>
  ) => Promise<ILoader<TReturn> | never>;
}
