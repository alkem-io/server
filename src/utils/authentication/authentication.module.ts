import { Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { UserService } from '../../domain/user/user.service';
import { AzureADStrategy } from './aad.strategy';
import { PassportModule } from '@nestjs/passport';
import { ProfileModule } from 'src/domain/profile/profile.module';
import { ProfileService } from 'src/domain/profile/profile.service';
import { TagsetModule } from 'src/domain/tagset/tagset.module';
import { TagsetService } from 'src/domain/tagset/tagset.service';

@Module({
  imports: [UserModule, ProfileModule, PassportModule, TagsetModule],
  providers: [UserService, AzureADStrategy, ProfileService, TagsetService],
  exports: [AzureADStrategy],
})
export class AuthenticationModule {}
