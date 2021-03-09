import { Module } from '@nestjs/common';
import { AgreementResolver } from './agreement.resolver';

@Module({
  providers: [AgreementResolver],
})
export class AgreementModule {}
