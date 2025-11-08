import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	Configuration,
	Identity,
	IdentityApi,
} from '@ory/kratos-client';

export interface MigrationKratosIdentityFetcher {
	findByEmail(email: string): Promise<Identity[]>;
}

const FIXTURE_PATH_ENV = 'MIGRATION_KRATOS_FIXTURE_PATH';
const ADMIN_BASE_URL_ENV = 'AUTH_ORY_KRATOS_ADMIN_BASE_URL_SERVER';
const LEGACY_ADMIN_BASE_URL_ENV = 'KRATOS_ADMIN_BASE_URL_SERVER';

const DEFAULT_FETCH_TIMEOUT_MS = 5000;

export interface CreateKratosIdentityFetcherOptions {
	fixturePath?: string;
	identityApi?: IdentityApi;
	requestTimeoutMs?: number;
}

export const createKratosIdentityFetcher = (
	options: CreateKratosIdentityFetcherOptions = {}
): MigrationKratosIdentityFetcher => {
	const fixturePath = options.fixturePath ?? process.env[FIXTURE_PATH_ENV];

	if (fixturePath) {
		return new FixtureIdentityFetcher(fixturePath);
	}

	const identityApi =
		options.identityApi ??
		new IdentityApi(
			new Configuration({
				basePath:
					process.env[ADMIN_BASE_URL_ENV] ??
					process.env[LEGACY_ADMIN_BASE_URL_ENV] ??
					'http://localhost:3000/ory/kratos',
			})
		);

	return new ApiIdentityFetcher(identityApi, {
		timeoutMs: options.requestTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
	});
};

class ApiIdentityFetcher implements MigrationKratosIdentityFetcher {
	constructor(
		private readonly identityApi: IdentityApi,
		private readonly config: { timeoutMs: number }
	) {}

	async findByEmail(email: string): Promise<Identity[]> {
		if (!email) {
			return [];
		}

		const abortController = new AbortController();
		const timer = setTimeout(() => abortController.abort(), this.config.timeoutMs);

		try {
			const { data } = await this.identityApi.listIdentities(
				{
					credentialsIdentifier: email,
					perPage: 5,
				},
				{
					signal: abortController.signal,
				}
			);

			return data ?? [];
		} finally {
			clearTimeout(timer);
		}
	}
}

class FixtureIdentityFetcher implements MigrationKratosIdentityFetcher {
	private readonly mapByEmail: Map<string, Identity[]> = new Map();

	constructor(private readonly fixturePath: string) {
		const absolute = resolve(fixturePath);
		const raw = readFileSync(absolute, 'utf8');
		const parsed = JSON.parse(raw) as Identity[] | Record<string, Identity>;

		const identities = Array.isArray(parsed)
			? parsed
			: Object.values(parsed ?? {});

		identities.forEach(identity => {
			const email = extractEmail(identity);
			if (!email) {
				return;
			}

			const current = this.mapByEmail.get(email) ?? [];
			current.push(clone(identity));
			this.mapByEmail.set(email, current);
		});
	}

	async findByEmail(email: string): Promise<Identity[]> {
		if (!email) {
			return [];
		}

		const normalizedEmail = email.trim().toLowerCase();
		return clone(this.mapByEmail.get(normalizedEmail) ?? []);
	}
}

const extractEmail = (identity: Identity): string | undefined => {
	const traitEmail = (identity as any)?.traits?.email;
	if (typeof traitEmail === 'string' && traitEmail.length > 0) {
		return traitEmail.toLowerCase();
	}

	const credentialEmail = identity?.credentials?.password?.identifiers?.[0];
	if (typeof credentialEmail === 'string' && credentialEmail.length > 0) {
		return credentialEmail.toLowerCase();
	}

	return undefined;
};

	const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
