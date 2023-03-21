import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DataLoaderInterceptorNotProvided } from '@common/exceptions/data-loader';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';
import { DataLoaderInterceptor } from '../interceptors';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../creators/base';

export function Loader<TParent, TReturn>(
  creatorRef: Type<DataLoaderCreator<TReturn>>,
  options?: DataLoaderCreatorOptions<TReturn, TParent>
): ParameterDecorator {
  return createParamDecorator(
    (
      innerCreatorRef: Type<DataLoaderCreator<TReturn>>,
      context: ExecutionContext
    ) => {
      const ctx =
        GqlExecutionContext.create(context).getContext<IGraphQLContext>();

      if (!ctx[DATA_LOADER_CTX_INJECT_TOKEN]) {
        throw new DataLoaderInterceptorNotProvided(
          `You must provide ${DataLoaderInterceptor.name} globally with the ${APP_INTERCEPTOR} injector token`
        );
      }

      return ctx[DATA_LOADER_CTX_INJECT_TOKEN].get(innerCreatorRef, options);
    }
  )(creatorRef);
}
