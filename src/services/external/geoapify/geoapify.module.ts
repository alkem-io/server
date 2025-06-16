import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeoapifyService } from '@services/external/geoapify/geoapify.service';

@Module({
  imports: [HttpModule],
  providers: [GeoapifyService],
  exports: [GeoapifyService],
})
export class GeoapifyModule {}
