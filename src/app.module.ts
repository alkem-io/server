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
import { DataManagementModule } from '@src/services/domain/data-management/data-management.module';
import { BootstrapModule } from '@src/core/bootstrap/bootstrap.module';
import { WinstonModule } from 'nest-winston';
import { WinstonConfigService } from '@src/config/winston.config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { MetadataModule } from '@src/services/domain/metadata/metadata.module';
import { KonfigModule } from '@src/services/platform/configuration/config/config.module';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { IpfsModule } from '@src/services/platform/ipfs/ipfs.module';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import configuration from '@config/configuration';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SearchModule } from '@src/services/domain/search/search.module';
import { ConfigurationTypes } from '@common/enums';
import { MembershipModule } from '@src/services/domain/membership/membership.module';
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
