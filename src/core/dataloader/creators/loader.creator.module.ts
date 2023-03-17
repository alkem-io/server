import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import * as creators from './loader.creators';

@Module({
  imports: [TypeOrmModule.forFeature([BaseChallenge])],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
