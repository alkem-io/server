import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialService } from './credential.service';

@Module({
  imports: [TypeOrmModule.forFeature([Credential])],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
