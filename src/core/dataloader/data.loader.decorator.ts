import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DataLoaderCreator } from './data.loader.interface';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { DataLoaderInterceptorNotProvided } from '@common/exceptions/data-loader';
import { DataLoaderInterceptor } from '@core/dataloader/data.loader.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

export const Loader = createParamDecorator(
  async (
    loaderRef: Type<DataLoaderCreator<unknown>>,
    context: ExecutionContext
  ) => {
    // todo: ctx type
    const ctx = GqlExecutionContext.create(context).getContext();

    if (!ctx[DATA_LOADER_CTX_INJECT_TOKEN]) {
      throw new DataLoaderInterceptorNotProvided(
        `You must provide ${DataLoaderInterceptor.name} globally with the ${APP_INTERCEPTOR} injector token`
      );
    }

    const loader = await ctx[DATA_LOADER_CTX_INJECT_TOKEN].get(loaderRef);

    return loader;
  }
);
// export const Loader = createParamDecorator(
//   async (
//     data: Type<DataLoaderCreator<any, any>>,
//     context: ExecutionContext & { [key: string]: any }
//   ) => {
//     const ctx: any = GqlExecutionContext.create(context).getContext();
//     if (ctx[DATA_LOADER_CTX_INJECT_TOKEN] === undefined) {
//       throw new DataLoaderInterceptorNotProvided(`
//             You should provide interceptor ${DataLoaderInterceptor.name} globally with ${APP_INTERCEPTOR}
//           `);
//     }
//     return await ctx[DATA_LOADER_CTX_INJECT_TOKEN].getLoader(data);
//   }
// );
