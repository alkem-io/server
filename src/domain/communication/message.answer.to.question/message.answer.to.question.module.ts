import { Module } from '@nestjs/common';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '@domain/community/virtual-contributor';

@Module({
  imports: [UserLookupModule, TypeOrmModule.forFeature([VirtualContributor])],
  providers: [],
  exports: [],
})
export class MessageAnswerToQuestionModule {}
