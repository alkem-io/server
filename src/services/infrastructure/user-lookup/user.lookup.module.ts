import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user/user.entity';
import { UserLookupService } from './user.lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserLookupService],
  exports: [UserLookupService],
})
export class UserLookupModule {}
