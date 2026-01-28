import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeoLocationService } from '@services/external/geo-location/geo.location.service';

@Module({
  imports: [HttpModule],
  providers: [GeoLocationService],
  exports: [GeoLocationService],
})
export class GeoLocationModule {}
