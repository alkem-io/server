import { Module } from '@nestjs/common';
import { AvatarCreatorService } from './avatar.creator.service';

@Module({
  imports: [],
  providers: [AvatarCreatorService],
  exports: [AvatarCreatorService],
})
export class AvatarCreatorModule {}
