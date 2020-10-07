import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { EcoverseService } from './ecoverse.service';
import { EcoverseResolver } from './ecoverse.resolver';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AzureADStrategy } from '../authentication/aad.strategy';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from './ecoverse.entity';

@Module({
  providers: [
    EcoverseService,
    UserGroupService,
    EcoverseResolver,
    AzureADStrategy,
  ],
  imports: [
    UserGroupModule,
    AuthenticationModule,
    UserModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
