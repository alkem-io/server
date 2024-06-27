import { Module } from '@nestjs/common';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '@domain/community/virtual-contributor';

@Module({
  imports: [
    ContributorLookupModule,
    TypeOrmModule.forFeature([VirtualContributor]),
  ],
  providers: [],
  exports: [],
})
export class MessageAnswerToQuestionModule {}
