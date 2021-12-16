import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '../discussion/discussion.entity';
import { Updates } from '../updates/updates.entity';
import { IdentityResolverService } from './identity.resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Updates]),
  ],
  providers: [IdentityResolverService],
  exports: [IdentityResolverService],
})
export class IdentityResolverModule {}
