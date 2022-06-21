import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

export const defaultMockerFactory = (token: InjectionToken | undefined) => {
  if (typeof token === 'function') {
    const mockMetadata = moduleMocker.getMetadata(
      token
    ) as MockFunctionMetadata<any, any>;
    const Mock = moduleMocker.generateFromMetadata(mockMetadata);
    return new Mock();
  }
};
