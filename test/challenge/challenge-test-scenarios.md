**Challange test scenarios**

- [x] In file: `create-challenge.e2e-spec.ts`
  - [x] create a successfull challenge
  - [x] create 2 challenges with different names 
  - [x] thow error - creating 2 challenges with same name `skipped for now` 
  - [x] create challenge without reference and context 
  - [x] create challenge with defined state 
  - [x] create a group, when create a challenge
  - [x] DDT invalid textId 

- [ ] In file: `flows-challenge.e2e-spec.ts`
  - [ ] create 2 users
         - make one of them focal point to user group
         - add the user group to the challenge and assert that a group focal point is a challenge_lead??
  - [ ] create a user
         - create a challenge with group
         - query the user (contributor) - should not be available
  - [ ] create a challenge with a name 'x'
         - create second challenge with name 'y'
         - modify the first challenge name to 'y' - error should be thrown
  - [ ] create the same challenge twice - should throw an error - fail


- [ ] In file: `other-entities-to-challenge.e2e.ts`
  - [ ] createGroupOnChallenge
  - [ ] add group to a challenge   
  - [ ] add user to a challenge - should return challenge, not group??

  - [ ] add unexisting user to a challenge
  - [ ] add unexisting group to a challenge
  - [ ] add user to unexisting challenge

  - [ ] create challenge with tagset
  - [ ] create a challenge with opportunity (createOpportunityOnChallenge)
  - [ ] create a challenge with contributors