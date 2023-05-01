import { EntityManager } from 'typeorm';

export const getJourneyByCollaboration = async (
  entityManager: EntityManager,
  collaborationID: string
) => {
  const [result]: {
    hubId: string | null;
    challengeId: string | null;
    opportunityId: string | null;
  }[] = await entityManager.query(`
      SELECT hub.id AS hubId, challenge.id AS challengeId, opportunity.id AS opportunityId FROM collaboration
      LEFT JOIN hub ON hub.collaborationId = collaboration.id
      LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
      LEFT JOIN opportunity ON opportunity.collaborationId = collaboration.id
      WHERE collaboration.id = '${collaborationID}'
    `);

  return result;
};
