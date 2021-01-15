import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/reference/reference.module';
import { TagsetModule } from '@domain/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [TagsetModule, ReferenceModule, TypeOrmModule.forFeature([Profile])],
  providers: [ProfileResolver, ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
