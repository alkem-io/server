import { Module } from '@nestjs/common';

/**
 * ContributorModule - Provides shared defaults for contributor entities (User, Organization).
 * The main service functionality has been moved to ProfileAvatarService in ProfileModule.
 * This module now only exports contributorDefaults for social reference templates.
 */
@Module({})
export class ContributorModule {}
