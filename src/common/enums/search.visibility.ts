import { registerEnumType } from '@nestjs/graphql';

export enum SearchVisibility {
  HIDDEN = 'hidden', // only shows up when directly accessed e.g. by provider
  ACCOUNT = 'account', // only shows up on searches within the scope of an account
  PUBLIC = 'public', // shows up globally
}

registerEnumType(SearchVisibility, {
  name: 'SearchVisibility',
});
