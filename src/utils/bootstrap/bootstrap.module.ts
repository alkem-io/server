import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from '@domain/ecoverse/ecoverse.module';
import { ProfileModule } from '@domain/profile/profile.module';
import { TagsetModule } from '@domain/tagset/tagset.module';
import { UserModule } from '@domain/user/user.module';
import { AccountModule } from '@utils/account/account.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [
    AccountModule,
    EcoverseModule,
    ProfileModule,
    TagsetModule,
    UserModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
