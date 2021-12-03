import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/collaboration';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community } from '@domain/community/community';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsPayloadBuilder } from './notifications.payload.builder';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ecoverse]),
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Discussion]),
  ],
  providers: [NotificationsPayloadBuilder],
  exports: [NotificationsPayloadBuilder],
})
export class NotificationsModule {}
