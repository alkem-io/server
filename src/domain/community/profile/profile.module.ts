import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';

@Module({
  imports: [TagsetModule, ReferenceModule, TypeOrmModule.forFeature([Profile])],
  providers: [ProfileResolverMutations, ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
