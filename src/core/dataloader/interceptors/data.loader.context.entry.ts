import { ContextId } from '@nestjs/core';
import { Type } from '@nestjs/common';
import { ILoader } from '../loader.interface';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../creators/base';

export interface DataLoaderContextEntry {
  contextId: ContextId;
  get: <TReturn>(
    creatorRef: Type<DataLoaderCreator<TReturn>>,
    options?: DataLoaderCreatorOptions<TReturn>
  ) => Promise<ILoader<TReturn> | never>;
}
