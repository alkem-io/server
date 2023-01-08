import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { FileManagerService } from './file.manager.service';
import { FileManagerResolverMutations } from './file.manager.resolver.mutations';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    IpfsModule,
  ],
  providers: [FileManagerResolverMutations, FileManagerService],
  exports: [FileManagerService],
})
export class FileManagerModule {}
