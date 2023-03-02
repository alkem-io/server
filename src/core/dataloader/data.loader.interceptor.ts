import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ContextId, ContextIdFactory, ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IDataLoader } from './data.loader.interface';

const LOADER_CTX_KEY = '';

interface DataLoaderContextEntry {
  contextId: ContextId,
  get: () => Promise<IDataLoader<string, unknown>>,
}

@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
  constructor(private readonly moduleRef: ModuleRef) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const graphqlExecutionContext = GqlExecutionContext.create(context);
    const ctx = graphqlExecutionContext.getContext();

    if (!ctx[LOADER_CTX_KEY]) {
      ctx[LOADER_CTX_KEY] = {
        contextId: ContextIdFactory.create(),
        get: (type: string) => {

        }
      } as DataLoaderContextEntry;
    }

    return next.handle();
  }

}