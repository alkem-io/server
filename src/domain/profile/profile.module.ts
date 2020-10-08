import { Module } from '@nestjs/common';
import { ProfileResolver } from './profile.resolver';

@Module({
  providers: [ProfileResolver],
})
export class ProfileModule {}
