import { Invitation } from '@domain/community/invitation';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationUtilService } from './invitation.util.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation])],
  providers: [InvitationUtilService],
  exports: [InvitationUtilService],
})
export class InvitationUtilModule {}
