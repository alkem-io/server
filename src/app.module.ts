import { Module } from '@nestjs/common';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '@src/core/authentication/authentication.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import aadConfig from '@src/config/aad.config';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import databaseConfig from '@src/config/database.config';
import { IDatabaseConfig } from '@src/common/interfaces/database.config.interface';
import { DataManagementModule } from '@src/services/data-management/data-management.module';
import serviceConfig from '@src/config/service.config';
import { BootstrapModule } from '@src/core/bootstrap/bootstrap.module';
import msGraphConfig from '@src/config/ms-graph.config';
import { WinstonModule } from 'nest-winston';
import aadClientConfig from '@src/config/aad.client.config';
import { WinstonConfigService } from '@src/config/winston.config';
import loggingConfig from '@src/config/logging.config';
import { SearchModule } from '@src/services/search/search.module';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import aadRopcConfig from '@src/config/aad.ropc.config';
import { MetadataModule } from '@src/services/metadata/metadata.module';
import { KonfigModule } from '@src/services/configuration/config/config.module';
import aadOboConfig from '@src/config/aad.obo.config';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import demoAuthProviderConfig from '@src/config/demo.auth.provider.config';
import { ApplicationFactoryModule } from '@domain/community/application/application.factory.module';
import { IpfsModule } from './services/ipfs/ipfs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env',
        '.env.default',
        '.env.aad.cherrytwist.api.default',
        '.env.aad.cherrytwist.client.default',
        '.env.logging.default',
        '.env.demo.auth.provider.default',
      ],
      isGlobal: true,
      load: [
        aadConfig,
        databaseConfig,
        serviceConfig,
        msGraphConfig,
        aadClientConfig,
        loggingConfig,
        aadRopcConfig,
        aadOboConfig,
        demoAuthProviderConfig,
      ],
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
        host: configService.get<IDatabaseConfig>('database')?.host,
        port: configService.get<IDatabaseConfig>('database')?.port,
        username: configService.get<IDatabaseConfig>('database')?.username,
        password: configService.get<IDatabaseConfig>('database')?.password,
        database: configService.get<IDatabaseConfig>('database')?.schema,
        logging: configService.get<IDatabaseConfig>('database')?.logging,
      }),
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRoot({
      uploads: false,
      autoSchemaFile: true,
      playground: true,
      fieldResolverEnhancers: ['guards'],
      sortSchema: true,
      context: ({ req }) => ({ req }),
    }),
    AuthenticationModule,
    ApplicationFactoryModule,
    EcoverseModule,
    MetadataModule,
    DataManagementModule,
    BootstrapModule,
    SearchModule,
    KonfigModule,
    IpfsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
