import { Test, TestingModule } from '@nestjs/testing';
import { Hocuspocus.GatewayGateway } from './hocuspocus.gateway.gateway';

describe('Hocuspocus.GatewayGateway', () => {
  let gateway: Hocuspocus.GatewayGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Hocuspocus.GatewayGateway],
    }).compile();

    gateway = module.get<Hocuspocus.GatewayGateway>(Hocuspocus.GatewayGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
