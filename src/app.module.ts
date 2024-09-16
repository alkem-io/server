import { MiddlewareConsumer, Module } from '@nestjs/common';
import { Cache, CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CloseCode } from 'graphql-ws';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import configuration from '@config/configuration';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { RequestLoggerMiddleware } from '@core/middleware/request.logger.middleware';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { AdminCommunicationModule } from '@platform/admin/communication/admin.communication.module';
import { AppController } from '@src/app.controller';
import { WinstonConfigService } from '@src/config/winston.config';
import { MetadataModule } from '@src/platform/metadata/metadata.module';
import { SearchModule } from '@services/api/search/v1/search.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import {
  AlkemioConfig,
  ConnectionContext,
  SubscriptionsTransportWsWebsocket,
  WebsocketContext,
} from '@src/types';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { RolesModule } from '@services/api/roles/roles.module';
import * as redisStore from 'cache-manager-redis-store';
import { RedisLockModule } from '@core/caching/redis/redis.lock.module';
import { ConversionModule } from '@services/api/conversion/conversion.module';
import { SessionExtendMiddleware } from '@src/core/middleware';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { MessageModule } from '@domain/communication/message/message.module';
import { LibraryModule } from '@library/library/library.module';
import { GeoLocationModule } from '@services/external/geo-location';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { DataLoaderInterceptor } from '@core/dataloader/interceptors';
import { InnovationHubInterceptor } from '@common/interceptors';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { SsiCredentialFlowController } from '@services/api-rest/ssi-credential-flow/ssi.credential.flow.controller';
import { SsiCredentialFlowModule } from '@services/api-rest/ssi-credential-flow/ssi.credential.flow.module';
import { StorageAccessModule } from '@services/api-rest/storage-access/storage.access.module';
import { MessageReactionModule } from '@domain/communication/message.reaction/message.reaction.module';
import {
  HttpExceptionFilter,
  GraphqlExceptionFilter,
  UnhandledExceptionFilter,
} from '@core/error-handling';
import { MeModule } from '@services/api/me';
import { ExcalidrawServerModule } from '@services/external/excalidraw-backend';
import { ChatGuidanceModule } from '@services/api/chat-guidance/chat.guidance.module';
import { LookupModule } from '@services/api/lookup';
import { AuthResetSubscriberModule } from '@services/auth-reset/subscriber/auth-reset.subscriber.module';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { IpfsLogModule } from '@services/api-rest/ipfs-log/ipfs.log.module';
import { ContributionMoveModule } from '@domain/collaboration/callout-contribution/callout.contribution.move.module';
import { TaskGraphqlModule } from '@domain/task/task.module';
import { ActivityFeedModule } from '@domain/activity-feed';
import { AdminSearchIngestModule } from '@platform/admin/search/admin.search.ingest.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { EventBusModule } from '@services/infrastructure/event-bus/event.bus.module';
import { WhiteboardIntegrationModule } from '@services/whiteboard-integration/whiteboard.integration.module';
import { PlatformSettingsModule } from '@platform/settings/platform.settings.module';
import { FileIntegrationModule } from '@services/file-integration';
import { AdminLicensingModule } from '@platform/admin/licensing/admin.licensing.module';
import { PlatformRoleModule } from '@platform/platfrom.role/platform.role.module';
import { LookupByNameModule } from '@services/api/lookup-by-name';
import { PlatformHubModule } from '@platform/platfrom.hub/platform.hub.module';
import { AdminContributorsModule } from '@platform/admin/avatars/admin.avatar.module';
import renderGraphiQL from 'graphiql'; // Official GraphiQL package
import { Request, Response } from 'express';
import { ExecutionResult } from 'graphql';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port, timeout } = configService.get('storage.redis', {
          infer: true,
        });
        return {
          store: redisStore,
          host,
          port,
          redisOptions: { connectTimeout: timeout * 1000 }, // Connection timeout in milliseconds
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const dbOptions = configService.get('storage.database', {
          infer: true,
        });
        return {
          type: 'mysql',
          insecureAuth: true,
          synchronize: false,
          cache: true,
          entities: [join(__dirname, '**', '*.entity.{ts,js}')],
          host: dbOptions.host,
          port: dbOptions.port,
          charset: dbOptions.charset,
          username: dbOptions.username,
          password: dbOptions.password,
          database: dbOptions.database,
          logging: dbOptions.logging,
        };
      },
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [],
      inject: [Cache],
      useFactory: async (cache: Cache) => {
        return {
          cors: false, // this is to avoid a duplicate cors origin header being created when behind the oathkeeper reverse proxy
          uploads: false,
          autoSchemaFile: true,
          introspection: true,
          graphiql: true,
          playground: false,
          fieldResolverEnhancers: ['guards', 'filters'],
          sortSchema: true,
          persistedQueries: {
            cache: {
              get: async (key: string) => {
                return await cache.get(key); // Retrieve persisted query from Redis
              },
              set: async (key: string, value: any) => {
                await cache.set(key, value, { ttl: 60 * 60 * 24 * 7 }); // 7 days TTL for persisted queries
              },
              delete: async (key: string) => {
                await cache.del(key); // Delete persisted query from Redis
              },
            },
          },
          /***
           * graphql-ws requires passing the request object through the context method
           * !!! this is graphql-ws ONLY
           */
          context: (ctx: ConnectionContext) => {
            if (isWebsocketContext(ctx)) {
              return {
                req: {
                  ...ctx.extra.request,
                  headers: {
                    ...ctx.extra.request.headers,
                    ...ctx.connectionParams?.headers,
                  },
                  connectionParams: ctx.connectionParams,
                },
              };
            }

            return { req: ctx.req };
          },
          subscriptions: {
            'subscriptions-transport-ws': {
              /***
               * subscriptions-transport-ws required passing the request object
               * through the onConnect method
               */
              onConnect: (
                connectionParams: Record<string, any>,
                websocket: SubscriptionsTransportWsWebsocket // couldn't find a better type
              ) => {
                return {
                  req: { headers: websocket?.upgradeReq?.headers },
                };
              },
            },
            'graphql-ws': {
              onNext: (ctx, message, args, result) => {
                const context = args.contextValue as IGraphQLContext;
                const expiry = context.req.user.expiry;
                // if the session has expired, close the socket
                if (expiry && expiry < Date.now()) {
                  (ctx as WebsocketContext).extra.socket.close(
                    CloseCode.Unauthorized,
                    'Session expired'
                  );
                  return;
                }

                return result;
              },
            },
          },
        };
      },
    }),
    ScalarsModule,
    AuthenticationModule,
    AuthorizationModule,
    SpaceModule,
    MetadataModule,
    BootstrapModule,
    SearchModule,
    ActivityLogModule,
    RolesModule,
    KonfigModule,
    AdminContributorsModule,
    AdminCommunicationModule,
    AdminSearchIngestModule,
    AdminLicensingModule,
    AgentModule,
    MessageModule,
    MessageReactionModule,
    RegistrationModule,
    RedisLockModule,
    ConversionModule,
    LibraryModule,
    PlatformModule,
    PlatformRoleModule,
    PlatformHubModule,
    ContributionMoveModule,
    GeoLocationModule,
    ContributionReporterModule,
    InnovationHubModule,
    SsiCredentialFlowModule,
    StorageAccessModule,
    IpfsLogModule,
    MeModule,
    ExcalidrawServerModule,
    ChatGuidanceModule,
    VirtualContributorModule,
    LookupModule,
    LookupByNameModule,
    AuthResetSubscriberModule,
    TaskGraphqlModule,
    ActivityFeedModule,
    EventBusModule,
    WhiteboardIntegrationModule,
    FileIntegrationModule,
    PlatformSettingsModule,
  ],
  controllers: [AppController, SsiCredentialFlowController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DataLoaderInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InnovationHubInterceptor,
    },
    {
      // This should be the first filter in the list:
      // See Catch everything at: https://docs.nestjs.com/exception-filters
      provide: APP_FILTER,
      useClass: UnhandledExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    APP_ID_PROVIDER,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply your existing middlewares and GraphiQL middleware
    consumer
      .apply(RequestLoggerMiddleware, SessionExtendMiddleware)
      .forRoutes('/');

    // Serve GraphiQL at /graphiql
    consumer
      .apply((req: Request, res: Response, _next: any) => {
        res.send(
          renderGraphiQL({
            defaultQuery: '', // Optionally add a default query
            fetcher: async graphQLParams => {
              const response = await fetch('http://localhost:3000/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphQLParams),
              });
              const result = (await response.json()) as ExecutionResult; // Ensure the result matches the ExecutionResult type
              return result;
            },
          })
        );
      })
      .forRoutes('/graphiql'); // Serve GraphiQL at this route
  }
}
const isWebsocketContext = (context: unknown): context is WebsocketContext =>
  !!(context as WebsocketContext)?.extra;
