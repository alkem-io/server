import { Module } from '@nestjs/common';
import { ProjectResolver } from './project.resolver';

@Module({
  providers: [ProjectResolver]
})
export class ProjectModule {}
