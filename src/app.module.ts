import { ValidationPipe } from '@common/pipes/validation.pipe';
import ipfsConfig from '@config/ipfs.config';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { ApplicationFactoryModule } from '@domain/community/application/application.factory.module';
import { MessageModule } from '@domain/community/message/message.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { IDatabaseConfig } from '@src/common/interfaces/database.config.interface';
import aadClientConfig from '@src/config/aad.client.config';
import aadConfig from '@src/config/aad.config';
import aadOboConfig from '@src/config/aad.obo.config';
import aadRopcConfig from '@src/config/aad.ropc.config';
import databaseConfig from '@src/config/database.config';
import demoAuthProviderConfig from '@src/config/demo.auth.provider.config';
import loggingConfig from '@src/config/logging.config';
import msGraphConfig from '@src/config/ms-graph.config';
import serviceConfig from '@src/config/service.config';
import { WinstonConfigService } from '@src/config/winston.config';
import { AuthenticationModule } from '@src/core/authentication/authentication.module';
import { BootstrapModule } from '@src/core/bootstrap/bootstrap.module';
import { KonfigModule } from '@src/services/configuration/config/config.module';
import { DataManagementModule } from '@src/services/data-management/data-management.module';
import { MetadataModule } from '@src/services/metadata/metadata.module';
import { SearchModule } from '@src/services/search/search.module';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
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
        ipfsConfig,
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
      installSubscriptionHandlers: true,
      subscriptions: {
        keepAlive: 5000,
        onConnect: (connectionParams, websocket, context) => {
          // TODO Kolec
          console.log(
            'Connecting: ',
            context.request.headers['sec-websocket-key'],
            ' : ',
            (connectionParams as any)['authToken']
          );
        },
        onDisconnect: (websocket, context) => {
          console.log(
            'Disconnecting: ',
            context.request.headers['sec-websocket-key']
          );
        },
      },
    }),
    ScalarsModule,
    AuthenticationModule,
    ApplicationFactoryModule,
    EcoverseModule,
    MetadataModule,
    DataManagementModule,
    BootstrapModule,
    SearchModule,
    KonfigModule,
    IpfsModule,
    MessageModule,
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
