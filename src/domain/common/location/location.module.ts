import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './location.entity';
import { LocationService } from './location.service';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
