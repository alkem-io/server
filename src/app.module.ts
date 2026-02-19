import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { InnovationHubInterceptor } from '@common/interceptors';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import configuration from '@config/configuration';
import {
  configQuery,
  meQuery,
  platformMetadataQuery,
  spacesQuery,
} from '@config/graphql';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { LoaderCreatorModule } from '@core/dataloader/creators/loader.creator.module';
import { DataLoaderInterceptor } from '@core/dataloader/interceptors';
import {
  GraphqlExceptionFilter,
  HttpExceptionFilter,
  UnhandledExceptionFilter,
} from '@core/error-handling';
import { AuthInterceptor } from '@core/interceptors';
import { RequestLoggerMiddleware } from '@core/middleware/request.logger.middleware';
import { ActivityFeedModule } from '@domain/activity-feed';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ContributionMoveModule } from '@domain/collaboration/callout-contribution/callout.contribution.move.module';
import { CalloutTransferModule } from '@domain/collaboration/callout-transfer/callout.transfer.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { MessageModule } from '@domain/communication/message/message.module';
import { MessageReactionModule } from '@domain/communication/message.reaction/message.reaction.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { TaskGraphqlModule } from '@domain/task/task.module';
import { TemplateApplierModule } from '@domain/template/template-applier/template.applier.module';
import { Cipher, EncryptionModule } from '@hedger/nestjs-encryption';
import { LibraryModule } from '@library/library/library.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensingWingbackSubscriptionModule } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { PlatformHubModule } from '@platform/platform.hub/platform.hub.module';
import { PlatformRoleModule } from '@platform/platform-role/platform.role.module';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { ConversionModule } from '@services/api/conversion/conversion.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { LookupModule } from '@services/api/lookup';
import { LookupByNameModule } from '@services/api/lookup-by-name';
import { MeModule } from '@services/api/me';
import { NotificationRecipientsModule } from '@services/api/notification-recipients/notification.recipients.module';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { RolesModule } from '@services/api/roles/roles.module';
import { SearchModule } from '@services/api/search/search.module';
import { UrlResolverModule } from '@services/api/url-resolver/url.resolver.module';
import { IdentityResolveModule } from '@services/api-rest/identity-resolve/identity-resolve.module';
import { AuthResetSubscriberModule } from '@services/auth-reset/subscriber/auth-reset.subscriber.module';
import { CollaborativeDocumentIntegrationModule } from '@services/collaborative-document-integration';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { GeoLocationModule } from '@services/external/geo-location';
import { WingbackManagerModule } from '@services/external/wingback/wingback.manager.module';
import { WingbackWebhookModule } from '@services/external/wingback-webhooks';
import { FileIntegrationModule } from '@services/file-integration';
import { EventBusModule } from '@services/infrastructure/event-bus/event.bus.module';
import { WhiteboardIntegrationModule } from '@services/whiteboard-integration/whiteboard.integration.module';
import { AppController } from '@src/app.controller';
import { WinstonConfigService } from '@src/config/winston.config';
import { SessionExtendMiddleware } from '@src/core/middleware';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { MetadataModule } from '@src/platform/metadata/metadata.module';
import { AdminCommunicationModule } from '@src/platform-admin/domain/communication/admin.communication.module';
import { DomainPlatformSettingsModule } from '@src/platform-admin/domain/organization/domain.platform.settings.module';
import { AdminUsersModule } from '@src/platform-admin/domain/user/admin.users.module';
import { AdminLicensingModule } from '@src/platform-admin/licensing/admin.licensing.module';
import { AdminContributorsModule } from '@src/platform-admin/services/avatars/admin.avatar.module';
import { AdminGeoLocationModule } from '@src/platform-admin/services/geolocation/admin.geolocation.module';
import {
  AlkemioConfig,
  ConnectionContext,
  SubscriptionsTransportWsWebsocket,
  WebsocketContext,
} from '@src/types';
import * as redisStore from 'cache-manager-redis-store';
import { print } from 'graphql/language/printer';
import { CloseCode } from 'graphql-ws';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { ApmApolloPlugin } from './apm/plugins';
import { PlatformAdminModule } from './platform-admin/admin/platform.admin.module';
import { InAppNotificationAdminModule } from './platform-admin/in-app-notification/in.app.notification.admin.module';
import { AdminSearchIngestModule } from './platform-admin/services/search/admin.search.ingest.module';

@Module({
  imports: [
    EncryptionModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const key = configService.get('security.encryption_key', {
          infer: true,
        });

        return {
          key,
          cipher: Cipher.AES_256_CBC,
        };
      },
    }),
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    EventEmitterModule.forRoot({
      global: true,
    }),
    ScheduleModule.forRoot(),
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

        const pgbouncerEnabled = dbOptions.pgbouncer?.enabled ?? false;
        const statementTimeoutMs =
          dbOptions.pgbouncer?.statement_timeout_ms ?? 60000;

        return {
          type: 'postgres' as const,
          synchronize: false,
          cache: true,
          entities: [join(__dirname, '**', '*.entity.{ts,js}')],
          host: dbOptions.host,
          port: dbOptions.port,
          username: dbOptions.username,
          password: dbOptions.password,
          database: dbOptions.database,
          logging: dbOptions.logging,
          // Connection pool settings for PostgreSQL
          extra: {
            max: dbOptions.pool?.max ?? 50,
            idleTimeoutMillis: dbOptions.pool?.idle_timeout_ms ?? 30000,
            connectionTimeoutMillis:
              dbOptions.pool?.connection_timeout_ms ?? 10000,
            // PgBouncer compatibility: set statement_timeout to prevent
            // long-running queries from holding pooled connections
            ...(pgbouncerEnabled && {
              statement_timeout: statementTimeoutMs,
              // Disable idle_in_transaction_session_timeout to let PgBouncer manage
              idle_in_transaction_session_timeout: statementTimeoutMs * 2,
            }),
          },
        };
      },
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const endpointCluster = configService.get('hosting.endpoint_cluster', {
          infer: true,
        });
        return {
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
                endpoint: `${endpointCluster}/api/private/graphql`,
                query: print(meQuery),
              },
              {
                name: 'Spaces',
                endpoint: `${endpointCluster}/api/private/graphql`,
                query: print(spacesQuery),
              },
              {
                name: 'Configuration',
                endpoint: `${endpointCluster}/api/public/graphql`,
                query: print(configQuery),
              },
              {
                name: 'Server Metadata',
                endpoint: `${endpointCluster}/api/public/graphql`,
                query: print(platformMetadataQuery),
              },
            ],
          },
          fieldResolverEnhancers: ['guards', 'filters'],
          plugins: [ApmApolloPlugin],
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
               * required for passport.js to execute the strategy against the incoming headers
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
    UrlResolverModule,
    LoaderCreatorModule,
    ScalarsModule,
    AuthenticationModule,
    AuthorizationModule,
    GraphqlGuardModule,
    SpaceModule,
    MetadataModule,
    BootstrapModule,
    ActivityLogModule,
    RolesModule,
    KonfigModule,
    AdminContributorsModule,
    AdminUsersModule,
    AdminCommunicationModule,
    AdminSearchIngestModule,
    AdminLicensingModule,
    AdminGeoLocationModule,
    LicensingWingbackSubscriptionModule,
    WingbackManagerModule,
    AgentModule,
    MessageModule,
    MessageReactionModule,
    NotificationRecipientsModule,
    RegistrationModule,
    ConversionModule,
    LibraryModule,
    PlatformModule,
    PlatformHubModule,
    PlatformAdminModule,
    InAppNotificationAdminModule,
    ContributionMoveModule,
    GeoLocationModule,
    ContributionReporterModule,
    InnovationHubModule,
    IdentityResolveModule,
    MeModule,
    VirtualContributorModule,
    InputCreatorModule,
    LookupModule,
    LookupByNameModule,
    AuthResetSubscriberModule,
    TaskGraphqlModule,
    ActivityFeedModule,
    EventBusModule,
    WhiteboardIntegrationModule,
    FileIntegrationModule,
    CollaborativeDocumentIntegrationModule,
    DomainPlatformSettingsModule,
    PlatformRoleModule,
    TemplateApplierModule,
    WingbackWebhookModule,
    CalloutTransferModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
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
