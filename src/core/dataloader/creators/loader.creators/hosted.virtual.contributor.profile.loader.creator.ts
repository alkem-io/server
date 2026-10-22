import { Injectable } from '@nestjs/common';
import { ProfileLoaderCreator } from './profile.loader.creator';

/**
 * Loads the profile of a Virtual Contributor card listed among an account's
 * hosted resources.
 *
 * The data loader interceptor caches one loader per request, keyed by the
 * creator and the parent class only — never by the privilege options. Reusing
 * ProfileLoaderCreator with `parentClassRef: VirtualContributor` would share
 * that loader with `VirtualContributor.profile`, which checks READ on the
 * Virtual Contributor itself, so whichever field resolved first would impose
 * its check on the other. A distinct creator gives the card its own loader.
 */
@Injectable()
export class HostedVirtualContributorProfileLoaderCreator extends ProfileLoaderCreator {}
