import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aspect } from './aspect.entity';
import { AspectResolver } from './aspect.resolver';
import { AspectService } from './aspect.service';

@Module({
  imports: [TypeOrmModule.forFeature([Aspect])],
  providers: [AspectResolver, AspectService],
  exports: [AspectService],
})
export class AspectModule {}
