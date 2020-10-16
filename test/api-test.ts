import request from 'supertest';

const baseUrl = 'http://localhost:4000/graphql';

beforeEach(() => {

  // ToDo:
  // Add DB reset/empty/seed as part of beforeEach()

  // request('http://localhost:4000/data-management/').get("reset-db")    
  // request('http://localhost:4000/data-management/').get("empty-ecoverse")    
  // request('http://localhost:4000/data-management/').get("seed-data")    
});

describe('GrqphQL API query integration tests', () => {


  // ToDo:
  // The current tests must be converted to DDT

  test("Should check user amount", async (done) => {
    request(baseUrl)
      .post("/")
      .send({
        query: "{ users{ id, name} }",
      })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
        done();
      });
  });

  test("Should check challengies amount", async (done) => {
    request(baseUrl)
      .post("/")
      .send({
        query: "{challenges{name,id,challengeLeads{name,id}}}"
      })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body.data.challenges.length).toBeGreaterThanOrEqual(1);
        done();
      });
  });

  test("Organizations number >= 0", async (done) => {
    request(baseUrl)
      .post("/")
      .send({
        query: "{organisations{name,id}}"
      })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body.data.organisations.length).toBeGreaterThanOrEqual(1);
        done();
      });
  });

  test("Groups number >= 0", async (done) => {
    request(baseUrl)
      .post("/")
      .send({
        query: "{groups{name,id}}"
      })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body.data.groups.length).toBeGreaterThanOrEqual(1);
        done();
      });
  });

  test("Tagset number >= 0", async (done) => {
    request(baseUrl)
      .post("/")
      .send({
        query: "{tagset{name,id}}"
      })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body.data.tagset.id).toEqual("1");
        done();
      });
  });

});

describe('GrqphQL API mutation integration tests', () => {

});
