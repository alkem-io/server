import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { Callout } from '@domain/collaboration/callout';
import { PostMoveService } from './post.move.service';
import { PostMoveResolverMutations } from './post.move.resolver.mutations';
import { PostModule } from './post.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';

@Module({
  imports: [
    PostModule,
    AuthorizationModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([Post, Callout]),
  ],
  providers: [PostMoveService, PostMoveResolverMutations],
  exports: [PostMoveService],
})
export class PostMoveModule {}
