import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aspect } from './aspect.entity';
import { Callout } from '@domain/collaboration/callout';
import { AspectMoveService } from './aspect.move.service';
import { AspectMoveResolverMutations } from './aspect.move.resolver.mutations';
import { AspectModule } from './aspect.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    AspectModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([Aspect, Callout]),
  ],
  providers: [AspectMoveService, AspectMoveResolverMutations],
  exports: [AspectMoveService],
})
export class AspectMoveModule {}
