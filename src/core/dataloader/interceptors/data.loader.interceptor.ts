import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  DataLoaderCreatorInitError,
  DataLoaderNotProvided,
} from '@common/exceptions/data-loader';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { DataLoaderContextEntry } from './data.loader.context.entry';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';

@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
  constructor(
    private readonly moduleRef: ModuleRef,
    private authorizationService: AuthorizationService
  ) {}
  // intercept every request and inject the data loader creator in the context
  intercept(context: ExecutionContext, next: CallHandler) {
    const contextType = context.getType<'http' | 'graphql' | 'rpc' | 'rmq'>();

    // Skip non-GraphQL contexts (RPC, RabbitMQ, HTTP REST, etc.)
    // DataLoaders are only meaningful for GraphQL query batching
    if (contextType !== 'graphql') {
      return next.handle();
    }

    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    // Safety check - ensure we have a request object
    if (!ctx?.req) {
      return next.handle();
    }

    ctx[DATA_LOADER_CTX_INJECT_TOKEN] = {
      // generate a key to associate each injectable instance with;
      // the key is used to generate a single instance across multiple resolve() calls,
      // and ensure they share the same generated DI container sub-tree
      contextId: ContextIdFactory.create(),
      get: (creatorRef, options = {}) => {
        // handle generic loaders initialized with different typeorm definitions
        const creatorName = options?.parentClassRef
          ? `${creatorRef.name}:${options.parentClassRef.name}`
          : creatorRef.name;

        if (ctx[creatorName]) {
          return ctx[creatorName];
        }
        // 'moduleRef.resolve' is used instead of 'moduleRef.get' when resolving scoped providers
        // https://docs.nestjs.com/fundamentals/module-ref#resolving-scoped-providers
        // To retrieve a provider from the global context
        // (for example, if the provider has been injected in a different module), pass the { strict: false }
        ctx[creatorName] = this.moduleRef
          .resolve<DataLoaderCreator<any>>(
            creatorRef,
            ctx[DATA_LOADER_CTX_INJECT_TOKEN].contextId,
            { strict: false }
          )
          .catch(() => {
            throw new DataLoaderNotProvided(
              `${DataLoaderInterceptor.name} unable to resolve ${creatorName}. Make sure that it is provided in your module providers list.`
            );
          })
          .then(creator => {
            // WORKAROUND -> disable the cache for subscription context
            // these headers are determining if it's a subscription context
            const enableCacheForQueries =
              options?.cache ??
              (ctx.req.headers.connection !== 'Upgrade' &&
                ctx.req.headers.upgrade !== 'websocket');
            // initialize the authorize function
            const authorize = (
              result: { authorization?: AuthorizationPolicy },
              privilege: AuthorizationPrivilege
            ) => {
              this.authorizationService.grantAccessOrFail(
                ctx.req.user,
                result.authorization,
                privilege!,
                'authorize data loader result'
              );

              return true;
            };

            return creator.create({
              ...options,
              authorize,
              cache: enableCacheForQueries,
            });
          })
          .catch(e => {
            throw new DataLoaderCreatorInitError(
              `Unable to initialize creator ${creatorName}: ${e}`
            );
          });

        return ctx[creatorName];
      },
    } as DataLoaderContextEntry;

    return next.handle();
  }
}
