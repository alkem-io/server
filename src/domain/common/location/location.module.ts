import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './location.entity';
import { LocationService } from './location.service';
import { GeoapifyModule } from '@services/external/geoapify/geoapify.module';

@Module({
  imports: [GeoapifyModule, TypeOrmModule.forFeature([Location])],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
