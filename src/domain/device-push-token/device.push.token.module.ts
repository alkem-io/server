import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicePushToken } from './device.push.token.entity';
import { DevicePushTokenResolverMutations } from './device.push.token.resolver.mutations';
import { DevicePushTokenService } from './device.push.token.service';

@Module({
  imports: [TypeOrmModule.forFeature([DevicePushToken])],
  providers: [DevicePushTokenService, DevicePushTokenResolverMutations],
  exports: [DevicePushTokenService],
})
export class DevicePushTokenModule {}
