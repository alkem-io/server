import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './location.entity';
import { LocationService } from './location.service';
import { GeoapifyModule } from '@services/external/geoapify/geoapify.module';
import { LocationResolverFields } from './location.resolver.fields';

@Module({
  imports: [GeoapifyModule, TypeOrmModule.forFeature([Location])],
  providers: [LocationService, LocationResolverFields],
  exports: [LocationService],
})
export class LocationModule {}
