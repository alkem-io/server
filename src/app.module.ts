import { ConfigurationTypes } from '@common/enums';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { extractEmailSubscriptionContext } from '@common/utils/connectionContext.utils';
import configuration from '@config/configuration';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { RequestLoggerMiddleware } from '@core/middleware/request.logger.middleware';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserService } from '@domain/community/user/user.service';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { WinstonConfigService } from '@src/config/winston.config';
import { DataManagementModule } from '@src/services/domain/data-management/data-management.module';
import { MembershipModule } from '@src/services/domain/membership/membership.module';
import { MetadataModule } from '@src/services/domain/metadata/metadata.module';
import { SearchModule } from '@src/services/domain/search/search.module';
import { KonfigModule } from '@src/services/platform/configuration/config/config.module';
import { IpfsModule } from '@src/services/platform/ipfs/ipfs.module';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { SsiAgentModule } from './services/platform/ssi/agent/ssi.agent.module';

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
        host: configService.get(ConfigurationTypes.Storage)?.database?.host,
        port: configService.get(ConfigurationTypes.Storage)?.database?.port,
        username: configService.get(ConfigurationTypes.Storage)?.database
          ?.username,
        password: configService.get(ConfigurationTypes.Storage)?.database
          ?.password,
        database: configService.get(ConfigurationTypes.Storage)?.database
          ?.schema,
        logging: configService.get(ConfigurationTypes.Storage)?.database
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
    //     // host: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom.database
    //     //   ?.host,
    //     // port: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom.database
    //     //   ?.port,
    //     // username: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom
    //     //   .database?.username,
    //     // password: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom
    //     //   .database?.password,
    //     // database: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom.database
    //     //   ?.schema,

    //     logging: configService.get(ConfigurationTypes.Identity)?.ssi.jolocom
    //       .database?.logging,
    //     database: './jolocom.sqlite3',
    //   }),
    // }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync({
      imports: [UserModule],
      inject: [UserService],
      useFactory: async (userService: UserService) => ({
        cors: false, // this is to avoid a duplicate cors origin header being created when behind the oathkeeper reverse proxy
        uploads: false,
        autoSchemaFile: true,
        introspection: true,
        playground: {
          settings: {
            'request.credentials': 'include',
          },
        },
        fieldResolverEnhancers: ['guards'],
        sortSchema: true,
        installSubscriptionHandlers: true,
        context: ({ req, connection }) =>
          // once the connection is established in onConnect, the context will have the user populated
          connection
            ? {
                connection: {
                  headers: {
                    authorization: connection.context['Authorization']
                      ? connection.context['Authorization']
                      : connection.context['authorization'],
                  },
                },
              }
            : { req },
        subscriptions: {
          keepAlive: 5000,
          onConnect: async (_, __, context) => {
            // TODO need to do full authentication here
            // Might need to do something similar to https://github.com/nestjs/docs.nestjs.com/issues/394
            const email = extractEmailSubscriptionContext(context);
            if (email) {
              const user = await userService.getUserByEmail(email);
              // this object will be passed via the connection context
              return {
                user,
              };
            }

            throw new Error('Missing auth token!');
          },
        },
      }),
    }),
    ScalarsModule,
    AuthenticationModule,
    AuthorizationModule,
    EcoverseModule,
    MetadataModule,
    DataManagementModule,
    BootstrapModule,
    SearchModule,
    MembershipModule,
    KonfigModule,
    IpfsModule,
    SsiAgentModule,
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
