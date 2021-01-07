import { GraphQLError } from 'graphql';
import validator from 'validator';

const uri = (value: string) => {
  if (validator.isURL(value)) return true;

  throw new GraphQLError('Must be in URI format');
};

export default uri;
