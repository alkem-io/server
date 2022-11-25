import { ValueProvider } from '@nestjs/common';
import { PublicPart } from './public-part';

export type MockValueProvider<T> = ValueProvider<PublicPart<T>>;
