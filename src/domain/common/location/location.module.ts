import { Module } from '@nestjs/common';
import { GeoapifyModule } from '@services/external/geoapify/geoapify.module';
import { LocationService } from './location.service';

@Module({
  imports: [GeoapifyModule],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
