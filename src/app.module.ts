import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from './authentication/authentication.module';
import { AgreementModule } from './agreement/agreement.module';
import { UserModule } from './user/user.module';
import { ChallengeModule } from './challenge/challenge.module';
import { ContextModule } from './context/context.module';
import { DidModule } from './did/did.module';
import { EcoverseModule } from './ecoverse/ecoverse.module';
import { OrganisationModule } from './organisation/organisation.module';
import { ProjectModule } from './project/project.module';
import { ReferenceModule } from './reference/reference.module';
import { TagModule } from './tag/tag.module';
import { UserGroupModule } from './user-group/user-group.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import aadConfig from './config/aad.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      // databaseConfig as TypeOrmModuleOptions
      {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'toor',
      insecureAuth: true,
      database: 'cherrytwist',
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
    }
    ),
    AuthenticationModule,
    AgreementModule,
    UserModule,
    ChallengeModule,
    ContextModule,
    DidModule,
    EcoverseModule,
    OrganisationModule,
    ProjectModule,
    ReferenceModule,
    TagModule,
    UserGroupModule,
    GraphQLModule.forRoot({
      autoSchemaFile: 'schema.gql',
      playground: true
    }),
    ConfigModule.forRoot({
      envFilePath: ['.env.default'],
      isGlobal: true,
      load: [aadConfig, databaseConfig]
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
