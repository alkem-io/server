import { User } from '@domain/community/user/user.entity';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserAuthenticationLinkService } from './user.authentication.link.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UserLookupModule, KratosModule],
  providers: [UserAuthenticationLinkService],
  exports: [UserAuthenticationLinkService],
})
export class UserAuthenticationLinkModule {}
