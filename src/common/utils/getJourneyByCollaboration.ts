import { EntityManager } from 'typeorm';

export const getJourneyByCollaboration = async (
  entityManager: EntityManager,
  collaborationID: string
) => {
  const [result]: {
    spaceId: string | null;
    challengeId: string | null;
    opportunityId: string | null;
  }[] = await entityManager.query(`
      SELECT space.id AS spaceId, challenge.id AS challengeId, opportunity.id AS opportunityId FROM collaboration
      LEFT JOIN space ON space.collaborationId = collaboration.id
      LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
      LEFT JOIN opportunity ON opportunity.collaborationId = collaboration.id
      WHERE collaboration.id = '${collaborationID}'
    `);

  return result;
};
