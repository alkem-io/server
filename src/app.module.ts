import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CloseCode } from 'graphql-ws';
import { ConfigurationTypes } from '@common/enums';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import configuration from '@config/configuration';
import {
  configQuery,
  spacesQuery,
  meQuery,
  platformMetadataQuery,
} from '@config/graphql';
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
import { SearchModule } from '@services/api/search/search.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { print } from 'graphql/language/printer';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import {
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
import { InnovationHubModule } from '@domain/innovation-hub';
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
import { WhiteboardIntegrationModule } from '@services/whiteboard-integration/whiteboard.integration.module';

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
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get(ConfigurationTypes.STORAGE)?.redis?.host,
        port: configService.get(ConfigurationTypes.STORAGE)?.redis?.port,
        redisOptions: {
          connectTimeout:
            configService.get(ConfigurationTypes.STORAGE)?.redis?.timeout *
            1000, // Connection timeout in milliseconds
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        insecureAuth: true,
        synchronize: false,
        cache: true,
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        host: configService.get(ConfigurationTypes.STORAGE)?.database?.host,
        port: configService.get(ConfigurationTypes.STORAGE)?.database?.port,
        charset: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.charset,
        username: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.username,
        password: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.password,
        database: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.schema,
        logging: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.logging,
      }),
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        cors: false, // this is to avoid a duplicate cors origin header being created when behind the oathkeeper reverse proxy
        uploads: false,
        autoSchemaFile: true,
        introspection: true,
        playground: {
          settings: {
            'request.credentials': 'include',
          },
          tabs: [
            {
              name: 'Me',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/private/graphql`,
              query: print(meQuery),
            },
            {
              name: 'Spaces',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/private/graphql`,
              query: print(spacesQuery),
            },
            {
              name: 'Configuration',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/public/graphql`,
              query: print(configQuery),
            },
            {
              name: 'Server Metadata',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/public/graphql`,
              query: print(platformMetadataQuery),
            },
          ],
        },
        fieldResolverEnhancers: ['guards', 'filters'],
        sortSchema: true,
        persistedQueries: false,
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
      }),
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
    AdminCommunicationModule,
    AdminSearchIngestModule,
    AgentModule,
    MessageModule,
    MessageReactionModule,
    RegistrationModule,
    RedisLockModule,
    ConversionModule,
    LibraryModule,
    PlatformModule,
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
    AuthResetSubscriberModule,
    TaskGraphqlModule,
    ActivityFeedModule,
    WhiteboardIntegrationModule,
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
    consumer
      .apply(RequestLoggerMiddleware, SessionExtendMiddleware)
      .forRoutes('/');
  }
}

const isWebsocketContext = (context: unknown): context is WebsocketContext =>
  !!(context as WebsocketContext)?.extra;
