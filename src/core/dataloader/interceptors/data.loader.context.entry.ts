import { ContextId } from '@nestjs/core';
import { Type } from '@nestjs/common';
import { ILoader } from '../loader.interface';
import {
  DataLoaderCreator,
  DataLoaderCreatorInitOptions,
} from '../creators/base';

export interface DataLoaderContextEntry {
  contextId: ContextId;
  get: <TReturn>(
    creatorRef: Type<DataLoaderCreator<TReturn>>,
    options?: DataLoaderCreatorInitOptions<TReturn>
  ) => Promise<ILoader<TReturn> | never>;
}
