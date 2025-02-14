import { Module } from '@nestjs/common';
import { KratosService } from './kratos.service';
@Module({
  imports: [],
  providers: [KratosService],
  exports: [KratosService],
})
export class KratosModule {}
