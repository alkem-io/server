import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge';
import { Opportunity } from '@domain/collaboration/opportunity';
import { Project } from '@domain/collaboration/project';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Project]),
  ],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
