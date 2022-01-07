import { ConfigurationTypes } from '@common/enums';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import configuration from '@config/configuration';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { RequestLoggerMiddleware } from '@core/middleware/request.logger.middleware';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCommunicationModule } from '@services/admin/communication/admin.communication.module';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { WinstonConfigService } from '@src/config/winston.config';
import { MembershipModule } from '@src/services/domain/membership/membership.module';
import { MetadataModule } from '@src/services/domain/metadata/metadata.module';
import { SearchModule } from '@src/services/domain/search/search.module';
import { KonfigModule } from '@src/services/platform/configuration/config/config.module';
import { IpfsModule } from '@src/services/platform/ipfs/ipfs.module';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { SsiAgentModule } from './services/platform/ssi/agent/ssi.agent.module';
import {
  configQuery,
  hubsQuery,
  meQuery,
  serverMetadataQuery,
} from '@src/graphql';
import { print } from 'graphql/language/printer';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
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
    // TypeOrmModule.forRootAsync({
    //   name: 'jolocom',
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     type: 'sqlite', //todo: switch to mysql when issue is addressed.
    //     insecureAuth: true,
    //     synchronize: true /* note: only for demo */,
    //     cache: true,
    //     entities: [
    //       'node_modules/@jolocom/sdk-storage-typeorm/js/src/entities/*.js',
    //     ],
    //     // NOTE: these are in until jolocom fixes the name issue on typeorm-mysql.
    //     // host: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom.database
    //     //   ?.host,
    //     // port: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom.database
    //     //   ?.port,
    //     // username: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom
    //     //   .database?.username,
    //     // password: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom
    //     //   .database?.password,
    //     // database: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom.database
    //     //   ?.schema,

    //     logging: configService.get(ConfigurationTypes.IDENTITY)?.ssi.jolocom
    //       .database?.logging,
    //     database: './jolocom.sqlite3',
    //   }),
    // }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync({
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
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(meQuery),
            },
            {
              name: 'Hubs',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(hubsQuery),
            },
            {
              name: 'Configuration',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(configQuery),
            },
            {
              name: 'Server Metadata',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(serverMetadataQuery),
            },
          ],
        },
        fieldResolverEnhancers: ['guards'],
        sortSchema: true,
        installSubscriptionHandlers: true,
        context: ({ req, connection }) =>
          // once the connection is established in onConnect, the context will have the user populated
          connection ? { req: connection.context } : { req },
        subscriptions: {
          keepAlive: 5000,
          onConnect: async (
            _: { [key: string]: any },
            __: { [key: string]: any },
            context
          ) => {
            const authHeader = context.request.headers.authorization;
            // Note: passing through headers so can leverage http authentication setup
            // Details in https://github.com/nestjs/docs.nestjs.com/issues/394
            return { headers: { authorization: `${authHeader}` } };
          },
          onDisconnect: async (_: any, __: any) => {
            // Todo: make a nicer error message if the subscription fails due to an execption being thrown
          },
        },
      }),
    }),
    ScalarsModule,
    AuthenticationModule,
    AuthorizationModule,
    EcoverseModule,
    MetadataModule,
    BootstrapModule,
    SearchModule,
    MembershipModule,
    KonfigModule,
    IpfsModule,
    SsiAgentModule,
    AdminCommunicationModule,
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
export class AppModule {
  configure(consummer: MiddlewareConsumer) {
    consummer.apply(RequestLoggerMiddleware).forRoutes('/');
  }
}
