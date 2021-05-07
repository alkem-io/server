import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [ProfileModule, AgentModule, TypeOrmModule.forFeature([User])],
  providers: [
    UserService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
  ],
  exports: [UserService],
})
export class UserModule {}
