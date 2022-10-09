import { Module } from '@nestjs/common';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { WalletManagerAdapter } from './wallet.manager.adapter';

@Module({
  imports: [TrustRegistryAdapterModule],
  providers: [WalletManagerAdapter],
  exports: [WalletManagerAdapter],
})
export class WalletManagerAdapterModule {}
