**Challange test scenarios**

- [x] In file: `create-challenge.e2e-spec.ts`
  - [x] create a successfull challenge
  - [x] remove a challenge
  - [x] create 2 challenges with different names 
  - [x] thow error - creating 2 challenges with same name `skipped for now` 
  - [x] create challenge without reference and context 
  - [x] create challenge with defined state 
  - [x] create a group, when create a challenge
  - [x] DDT invalid textId 

- [ ] In file: `flows-challenge.e2e-spec.ts`
  - [ ] create 2 users
         - create a challenge
         - make the first user focal point to the group, created with the challenge creation
         - add the user group to the challenge and assert that a group focal point is a challenge_lead??
  - [ ] create a user
         - create a challenge with group
         - don't add the user to the challenge or to the challenge group
         - query the challenge contributors - should not be available
  - [ ] create a challenge with a name 'x'
         - create second challenge with name 'y'
         - modify the first challenge name to 'y' - error should be thrown
  - [ ] create the same challenge twice - should throw an error - fail


- [x] In file: `other-entities-to-challenge.e2e.ts`
  - [x] createGroupOnChallenge
  - [x] createOpportunityOnChallenge
  - [x] addUserToChallenge
  - [x] add unexisting user to a challenge
  - [x] add user to unexisting challenge
