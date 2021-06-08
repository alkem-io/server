import { Module } from '@nestjs/common';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '@src/core/authentication/authentication.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DataManagementModule } from '@src/services/data-management/data-management.module';
import { BootstrapModule } from '@src/core/bootstrap/bootstrap.module';
import { WinstonModule } from 'nest-winston';
import { WinstonConfigService } from '@src/config/winston.config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { MetadataModule } from '@src/services/metadata/metadata.module';
import { KonfigModule } from '@src/services/configuration/config/config.module';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { IpfsModule } from './services/ipfs/ipfs.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import configuration from '@config/configuration';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SearchModule } from './services/search/search.module';
import { ConfigurationTypes } from '@common/enums';
import { MembershipModule } from './services/membership/membership.module';
import { SsiAgentModule } from './services/ssi/agent/ssi.agent.module';

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
    TypeOrmModule.forRootAsync({
      name: 'jolocom',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        insecureAuth: true,
        synchronize: true /* note: only for demo */,
        cache: true,
        entities: [
          'node_modules/@jolocom/sdk-storage-typeorm/js/src/entities/*.js',
        ],
        // host: configService.get(ConfigurationTypes.Storage)?.database?.host,
        // port: configService.get(ConfigurationTypes.Storage)?.database?.port,
        // username: configService.get(ConfigurationTypes.Storage)?.database
        //   ?.username,
        // password: configService.get(ConfigurationTypes.Storage)?.database
        //   ?.password,

        logging: configService.get(ConfigurationTypes.Storage)?.database
          ?.logging,
        database: './jolocom.sqlite3',
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
export class AppModule {}
