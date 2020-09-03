import { createConnection, Connection } from 'typeorm';
import { Ecoverse, User, Challenge, Tag, UserGroup, Context, Reference } from '../models';


 async function populate_sample_challenge() {
  console.log('Database: Starting the loading of the database... ');
  const connection = await createConnection();
  await connection.synchronize();
  console.log('Database: synchronisation complete... ');

  await populate_sample_challenge2(connection);

};

export async function populate_sample_challenge2(connection: Connection) {
  const challengeName = "Energy Web2";

  // Get the ecoverse
  var challenge = await connection
    .createQueryBuilder()
    .select("challenge")
    .from(Challenge, "challenge")
    .where("challenge.name = :name", { name: challengeName })
    .getOne();


    if (challenge) {
        const challengeJson= JSON.stringify(challenge, null, 4);
        console.log(`Found the challenge: ${challengeName} - ${challengeJson}`);

   } else {
        console.log(`Challenge not found: ${challengeName}; create a new one`);
        challenge = new Challenge(challengeName);
    }

    if (!challenge.context) {
        challenge.context = new Context();
    }

    challenge.context.description = "How might we incentivize consumers to communicate energy demand and production to allow all stakeholders to balance the grid?";
    const ref1 = new Reference("video", "http://localhost:8443/myVid", "Video explainer for the challenge");
    const ref2 = new Reference("EnergyWeb", "https://www.energyweb.org/", "Official site");
    challenge.context.references = [ ref1, ref2];
    await challenge.save();

}

populate_sample_challenge().then(()=>{
    console.log('Database: challenge added...');
    process.exit();
  }).catch(function(e){
    throw e;
  });
  