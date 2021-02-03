import { AUTH_OBO } from '@constants';
import { Module } from '@nestjs/common';
import { AadOboStrategy } from '@utils/aad/aad.obo.strategy';
import { AuthenticationModule } from '@utils/authentication/authentication.module';
import { MsGraphService } from './ms-graph.service';

@Module({
  imports: [AuthenticationModule],
  providers: [
    MsGraphService,
    {
      provide: AUTH_OBO,
      useClass: AadOboStrategy,
    },
  ],
  exports: [MsGraphService],
})
export class MsGraphModule {}
