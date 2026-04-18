import { Lucia } from "lucia";
import { D1Adapter } from "@lucia-auth/adapter-sqlite";

export function initializeLucia(D1: D1Database) {
	const adapter = new D1Adapter(D1, {
		user: "users",
		session: "sessions"
	});

	return new Lucia(adapter, {
		sessionCookie: {
			attributes: {
				secure: true,
				sameSite: "none"
			}
		},
        getUserAttributes: (attributes) => {
			return {
				username: attributes.username,
                email: attributes.email,
                avatarUrl: attributes.avatar_url,
                finnhubKey: attributes.finnhub_key,
                alphaKey: attributes.alpha_vantage_key
			};
		}
	});
}

declare module "lucia" {
	interface Register {
		Lucia: ReturnType<typeof initializeLucia>;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	email: string;
	avatar_url: string;
    finnhub_key: string | null;
    alpha_vantage_key: string | null;
}
