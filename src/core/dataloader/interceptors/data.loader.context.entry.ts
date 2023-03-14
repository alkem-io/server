import { ContextId } from '@nestjs/core';
import { Type } from '@nestjs/common';
import { ILoader } from '../loader.interface';
import { DataLoaderCreator } from '../creators/base/data.loader.creator';
import { DataLoaderCreatorOptions } from '../creators/base/data.loader.creator.options';

export interface DataLoaderContextEntry {
  contextId: ContextId;
  get: <TReturn>(
    creatorRef: Type<DataLoaderCreator<TReturn>>,
    options?: DataLoaderCreatorOptions
  ) => Promise<ILoader<TReturn> | never>;
}
