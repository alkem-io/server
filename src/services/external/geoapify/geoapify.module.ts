import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeoapifyService } from '@services/external/geoapify/geoapify.service';

@Module({
  imports: [HttpModule],
  providers: [GeoapifyService],
  exports: [GeoapifyService],
})
export class GeoapifyModule {}
