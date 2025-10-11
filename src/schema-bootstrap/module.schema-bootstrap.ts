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
import { CacheStubProvider } from './stubs/cache.stub';
import {
  DataSourceStubProvider,
  DefaultDataSourceStubProvider,
  EntityManagerStubProvider,
  DefaultEntityManagerStubProvider,
} from './stubs/db.stub';
import { EventBusStubProvider } from './stubs/event-bus.stub';
import { SearchStubProvider } from './stubs/search.stub';
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
  {
    provide: EncryptionService,
    useValue: {
      encrypt: async (value: string) => value,
      decrypt: async (value: string) => value,
    },
  },
];

@Global()
@Module({
  providers: STUB_PROVIDERS,
  exports: STUB_PROVIDERS,
})
class SchemaBootstrapStubModule {}

// NOTE: If any imported module attempts real connections, we will override its providers with stubs in a later task.

@Module({
  imports: [
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
    SearchModule,
    SchemaBootstrapStubModule,
  ],
})
export class SchemaBootstrapModule {}
