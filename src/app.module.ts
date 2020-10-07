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
import { TagModule } from './domain/tag/tag.module';
import { UserGroupModule } from './domain/user-group/user-group.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import aadConfig from './utils/config/aad.config';
import databaseConfig from './utils/config/database.config';
import { join } from 'path';

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
        entities: [join(__dirname, '**', '*.entity.{ts,js}')], // https://stackoverflow.com/questions/59435293/typeorm-entity-in-nestjs-cannot-use-import-statement-outside-a-module
        synchronize: true,
      },
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
      playground: true,
    }),
    ConfigModule.forRoot({
      envFilePath: ['.env.default'],
      isGlobal: true,
      load: [aadConfig, databaseConfig],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
