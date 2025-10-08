/**
 * Lightweight schema bootstrap (T030)
 * Goal: assemble only modules necessary to emit GraphQL SDL without connecting to external infra.
 * Imports intentionally minimal; stubs for infra-dependent modules will be provided where required.
 */
import { Module } from '@nestjs/common';
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
  ],
})
export class SchemaBootstrapModule {}
