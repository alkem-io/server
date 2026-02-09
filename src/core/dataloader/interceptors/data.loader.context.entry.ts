import { Type } from '@nestjs/common';
import { ContextId } from '@nestjs/core';
import {
  DataLoaderCreator,
  DataLoaderCreatorInitOptions,
} from '../creators/base';
import { ILoader } from '../loader.interface';

export interface DataLoaderContextEntry {
  contextId: ContextId;
  get: <TReturn>(
    creatorRef: Type<DataLoaderCreator<TReturn>>,
    options?: DataLoaderCreatorInitOptions<TReturn>
  ) => Promise<ILoader<TReturn> | never>;
}
