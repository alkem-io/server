import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from './utils/authentication/authentication.module';
import { AgreementModule } from './domain/agreement/agreement.module';
import { UserModule } from './domain/user/user.module';
import { ChallengeModule } from './domain/challenge/challenge.module';
import { ContextModule } from './domain/context/context.module';
import { DidModule } from './domain/did/did.module';
import { EcoverseModule } from './domain/ecoverse/ecoverse.module';
import { OrganisationModule } from './domain/organisation/organisation.module';
import { ProjectModule } from './domain/project/project.module';
import { ReferenceModule } from './domain/reference/reference.module';
import { TagsetModule } from './domain/tagset/tagset.module';
import { ProfileModule } from './domain/profile/profile.module';
import { UserGroupModule } from './domain/user-group/user-group.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import aadConfig from './utils/config/aad.config';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import databaseConfig from './utils/config/database.config';
import { IDatabaseConfig } from './interfaces/database.config.interface';
import serviceConfig from './utils/config/service.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '.env.default'],
      isGlobal: true,
      load: [aadConfig, databaseConfig, serviceConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<IDatabaseConfig>('database')?.host,
        port: configService.get<IDatabaseConfig>('database')?.port,
        cache: true,
        username: configService.get<IDatabaseConfig>('database')?.username,
        password: configService.get<IDatabaseConfig>('database')?.password,
        database: configService.get<IDatabaseConfig>('database')?.schema,
        insecureAuth: true,
        synchronize: true,
        logging: configService.get<IDatabaseConfig>('database')?.logging,
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      }),
    }),
    AuthenticationModule,
    AgreementModule,
    ChallengeModule,
    ContextModule,
    DidModule,
    EcoverseModule,
    OrganisationModule,
    ProfileModule,
    ProjectModule,
    ReferenceModule,
    TagsetModule,
    UserModule,
    UserGroupModule,
    GraphQLModule.forRoot({
      autoSchemaFile: 'schema.gql',
      playground: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
