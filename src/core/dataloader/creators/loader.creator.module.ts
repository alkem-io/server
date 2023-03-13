import { Module } from '@nestjs/common';
import * as creators from './loader.creators';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaboration } from '@domain/collaboration/collaboration';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BaseChallenge]),
  ],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
