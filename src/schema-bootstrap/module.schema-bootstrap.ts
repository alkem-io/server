/**
 * Lightweight schema bootstrap (T030)
 * Goal: assemble only modules necessary to emit GraphQL SDL without connecting to external infra.
 * Imports intentionally minimal; stubs for infra-dependent modules will be provided where required.
 */
import { Global, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import configuration from '@config/configuration';
// Domain/API modules that define GraphQL types (initial pass; extend incrementally if parity test reveals gaps)
import { SpaceModule } from '@domain/space/space/space.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { RolesModule } from '@services/api/roles/roles.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { SearchModule } from '@services/api/search/search.module';
import { MetadataModule } from '@src/platform/metadata/metadata.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { PlatformHubModule } from '@platform/platform.hub/platform.hub.module';
import { PlatformAdminModule } from '@src/platform-admin/admin/platform.admin.module';
import { InAppNotificationAdminModule } from '@src/platform-admin/in-app-notification/in.app.notification.admin.module';
import { LoaderCreatorModule } from '@core/dataloader/creators/loader.creator.module';
import { UrlResolverModule } from '@services/api/url-resolver/url.resolver.module';
import { ContributionMoveModule } from '@domain/collaboration/callout-contribution/callout.contribution.move.module';
import { GeoLocationModule } from '@services/external/geo-location';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { IdentityResolveModule } from '@services/api-rest/identity-resolve/identity-resolve.module';
import { MessageModule } from '@domain/communication/message/message.module';
import { MessageReactionModule } from '@domain/communication/message.reaction/message.reaction.module';
import { NotificationRecipientsModule } from '@services/api/notification-recipients/notification.recipients.module';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { ConversionModule } from '@services/api/conversion/conversion.module';
import { LibraryModule } from '@library/library/library.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { LookupModule } from '@services/api/lookup';
import { LookupByNameModule } from '@services/api/lookup-by-name';
import { MeModule } from '@services/api/me';
import { TaskGraphqlModule } from '@domain/task/task.module';
import { ActivityFeedModule } from '@domain/activity-feed';
import { WhiteboardIntegrationModule } from '@services/whiteboard-integration/whiteboard.integration.module';
import { FileIntegrationModule } from '@services/file-integration';
import { CollaborativeDocumentIntegrationModule } from '@services/collaborative-document-integration';
import { DomainPlatformSettingsModule } from '@src/platform-admin/domain/organization/domain.platform.settings.module';
import { PlatformRoleModule } from '@platform/platform-role/platform.role.module';
import { TemplateApplierModule } from '@domain/template/template-applier/template.applier.module';
import { CalloutTransferModule } from '@domain/collaboration/callout-transfer/callout.transfer.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { AdminContributorsModule } from '@src/platform-admin/services/avatars/admin.avatar.module';
import { AdminUsersModule } from '@src/platform-admin/domain/user/admin.users.module';
import { AdminCommunicationModule } from '@src/platform-admin/domain/communication/admin.communication.module';
import { AdminSearchIngestModule } from '@src/platform-admin/services/search/admin.search.ingest.module';
import { AdminLicensingModule } from '@src/platform-admin/licensing/admin.licensing.module';
import { AdminGeoLocationModule } from '@src/platform-admin/services/geolocation/admin.geolocation.module';
import { LicensingWingbackSubscriptionModule } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.module';
import { WingbackManagerModule } from '@services/external/wingback';
import { AuthResetSubscriberModule } from '@services/auth-reset/subscriber/auth-reset.subscriber.module';
import { WingbackWebhookModule } from '@services/external/wingback-webhooks';
import { CacheStubProvider } from './stubs/cache.stub';
import {
  DataSourceStubProvider,
  DefaultDataSourceStubProvider,
  EntityManagerStubProvider,
  DefaultEntityManagerStubProvider,
} from './stubs/db.stub';
import { EventBusStubProvider } from './stubs/event-bus.stub';
import { SearchStubProvider } from './stubs/search.stub';
import { MicroservicesStubProviders } from './stubs/microservices.stub';
import { EventBusProviderStubs } from './stubs/event-bus-providers.stub';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EncryptionService } from '@hedger/nestjs-encryption';

const STUB_PROVIDERS = [
  CacheStubProvider,
  DataSourceStubProvider,
  DefaultDataSourceStubProvider,
  EntityManagerStubProvider,
  DefaultEntityManagerStubProvider,
  EventBusStubProvider,
  SearchStubProvider,
  ...MicroservicesStubProviders,
  ...EventBusProviderStubs,
  {
    provide: AmqpConnection,
    useValue: {
      init: async () => undefined,
      connect: async () => undefined,
      createSubscriber: () => () => undefined,
      createRpc: () => ({
        dispose: async () => undefined,
      }),
      createChannel: async () => ({
        addSetup: async () => undefined,
        removeSetup: async () => undefined,
        ack: () => undefined,
        nack: () => undefined,
        // channel-level helpers — return values are not used here
        sendToQueue: () => true,
        publish: () => true,
        on: () => undefined,
        close: async () => undefined,
      }),
      channel: {
        addSetup: async () => undefined,
      },
      managedConnection: {
        on: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        close: async () => undefined,
      },
      channelManager: {
        addSetup: async () => undefined,
      },
      setDefaultRpcTimeout: () => undefined,
      request: async () => undefined,
      // AmqpConnection top-level methods should mirror @golevelup/nestjs-rabbitmq
      // which return boolean to indicate publish/send success synchronously.
      publish: () => true,
      sendToQueue: () => true,
      initChannel: async () => undefined,
      getChannelRef: () => ({
        addSetup: async () => undefined,
      }),
    },
  },
  {
    provide: WINSTON_MODULE_NEST_PROVIDER,
    useValue: {
      log: () => undefined,
      error: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      verbose: () => undefined,
    },
  },
  // WARNING: Passthrough stub for schema emission only.
  // Never use SchemaBootstrapModule in any context that handles sensitive data.
  {
    provide: EncryptionService,
    useValue: {
      encrypt: (value: string) => value,
      decrypt: (value: string) => value,
    },
  },
];

@Global()
@Module({
  providers: STUB_PROVIDERS,
  exports: STUB_PROVIDERS,
})
class SchemaBootstrapStubModule {}

@Module({
  imports: [
    SchemaBootstrapStubModule,
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      introspection: true,
    }),
    // Core schema-contributing modules
    ScalarsModule,
    SpaceModule,
    AgentModule,
    RolesModule,
    PlatformModule,
    PlatformHubModule,
    PlatformAdminModule,
    InAppNotificationAdminModule,
    MetadataModule,
    KonfigModule,
    LoaderCreatorModule,
    UrlResolverModule,
    ContributionMoveModule,
    CalloutTransferModule,
    BootstrapModule,
    AuthenticationModule,
    AuthorizationModule,
    ActivityLogModule,
    AdminContributorsModule,
    AdminUsersModule,
    AdminCommunicationModule,
    AdminSearchIngestModule,
    AdminLicensingModule,
    AdminGeoLocationModule,
    LicensingWingbackSubscriptionModule,
    WingbackManagerModule,
    GeoLocationModule,
    ContributionReporterModule,
    InnovationHubModule,
    IdentityResolveModule,
    MessageModule,
    MessageReactionModule,
    NotificationRecipientsModule,
    RegistrationModule,
    ConversionModule,
    LibraryModule,
    VirtualContributorModule,
    InputCreatorModule,
    LookupModule,
    LookupByNameModule,
    MeModule,
    TaskGraphqlModule,
    ActivityFeedModule,
    WhiteboardIntegrationModule,
    FileIntegrationModule,
    CollaborativeDocumentIntegrationModule,
    DomainPlatformSettingsModule,
    PlatformRoleModule,
    TemplateApplierModule,
    WingbackWebhookModule,
    AuthResetSubscriberModule,
    SearchModule,
  ],
})
export class SchemaBootstrapModule {}
