import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// ToDo
// Add support for connection to the DB and drop/populate DB
//    - GH Issue: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/coordination/163
// Add configurations file for environment against which, the tests are going to be run
// Add support for authentication

export const graphqlRequest = async (
  requestParams: any,
  app: INestApplication
) => {
  return request(app.getHttpServer())
    .post('/graphql')
    .send({ ...requestParams })
    .set('Accept', 'application/json');
};

// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-namespace
//   namespace jest {
//     interface Matchers<R> {
//       toContainObject(argument: any): R;
//     }
//   }
// }

// expect.extend({
//   toContainObject(received, argument) {
//     const pass = this.equals(
//       received,
//       expect.arrayContaining([expect.objectContaining(argument)])
//     );

//     if (pass) {
//       return {
//         message: () =>
//           `expected ${this.utils.printReceived(
//             received
//           )} not to contain object ${this.utils.printExpected(argument)}`,
//         pass: true,
//       };
//     } else {
//       return {
//         message: () =>
//           `expected ${this.utils.printReceived(
//             received
//           )} to contain object ${this.utils.printExpected(argument)}`,
//         pass: false,
//       };
//     }
//   },
// });
