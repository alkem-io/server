import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomModule } from '../room/room.module';
import { Updates } from './updates.entity';
import { UpdatesResolverFields } from './updates.resolver.fields';
import { UpdatesResolverMutations } from './updates.resolver.mutations';
import { UpdatesService } from './updates.service';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([Updates]),
    RoomModule,
  ],
  providers: [UpdatesService, UpdatesResolverFields, UpdatesResolverMutations],
  exports: [UpdatesService],
})
export class UpdatesModule {}
