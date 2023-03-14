import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DataLoaderInterceptorNotProvided } from '@common/exceptions/data-loader';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';
import { DataLoaderCreator } from '../data.loader.creator';
import { DataLoaderInterceptor } from '../interceptors/data.loader.interceptor';

export const Loader = createParamDecorator(
  (loaderRef: Type<DataLoaderCreator<unknown>>, context: ExecutionContext) => {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    if (!ctx[DATA_LOADER_CTX_INJECT_TOKEN]) {
      throw new DataLoaderInterceptorNotProvided(
        `You must provide ${DataLoaderInterceptor.name} globally with the ${APP_INTERCEPTOR} injector token`
      );
    }

    return ctx[DATA_LOADER_CTX_INJECT_TOKEN].get(loaderRef);
  }
);
