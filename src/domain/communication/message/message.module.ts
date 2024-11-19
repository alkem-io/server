import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@Module({
  imports: [
    ContributorLookupModule,
    TypeOrmModule.forFeature([VirtualContributor]),
  ],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
