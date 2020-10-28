import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getUserMemberships, getUsers } from './user.request.params';
import { AppModule } from '../../src/app.module';
import '../utils/array.matcher';
import { TestDataService } from '../../src/utils/data-management/test-data.service';

let testDataService: TestDataService;

let app: INestApplication;

beforeAll(async () => {
  const testModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testModule.createNestApplication();
  await app.init();
  testDataService = testModule.get(TestDataService);

  await testDataService.initUsers();
});

afterAll(async () => {
  await testDataService.teardownUsers();
  await app.close();
});

describe('Query all users', () => {
  it('should get users', async () => {
    const response = await getUsers(app);
    expect(response.status).toBe(200);
    expect(response.body.data.users).toContainObject({
      name: 'Bat Georgi',
    });
  });

  test('should get memberships', async () => {
    const response = await getUserMemberships(app);

    expect(response.status).toBe(200);
  });
});
