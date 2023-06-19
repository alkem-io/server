import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { Callout } from '@domain/collaboration/callout';
import { PostMoveService } from './post.move.service';
import { PostMoveResolverMutations } from './post.move.resolver.mutations';
import { PostModule } from './post.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    PostModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([Post, Callout]),
  ],
  providers: [PostMoveService, PostMoveResolverMutations],
  exports: [PostMoveService],
})
export class PostMoveModule {}
