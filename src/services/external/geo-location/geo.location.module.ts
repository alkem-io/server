import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeoLocationService } from '@services/external/geo-location/geo.location.service';

@Module({
  imports: [HttpModule],
  providers: [GeoLocationService],
  exports: [GeoLocationService],
})
export class GeoLocationModule {}
