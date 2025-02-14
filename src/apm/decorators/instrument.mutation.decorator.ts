import { createInstrumentMethodDecorator } from './create.instrument.method.decorator';

export const InstrumentMutation =
  createInstrumentMethodDecorator('resolver-mutation');
