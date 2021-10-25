import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityResolverService } from './identity.resolver.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [IdentityResolverService],
  exports: [IdentityResolverService],
})
export class IdentityResolverModule {}
