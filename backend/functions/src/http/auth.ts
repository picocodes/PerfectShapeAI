import { HttpError } from "./errors.js";

export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthVerifier {
  verify(header: string | undefined): Promise<AuthUser>;
}

export function devAuthVerifier(): AuthVerifier {
  return {
    async verify(header) {
      const match = /^Bearer dev:([A-Za-z0-9_-]{4,128}):(\S+)$/.exec(header ?? "");
      if (!match || match[2].includes(":")) throw new HttpError(401, "invalid_auth", "Sign in again.");
      return { uid: match[1], email: match[2] };
    }
  };
}

export function firebaseAuthVerifier(): AuthVerifier {
  return {
    async verify(header) {
      if (!header?.startsWith("Bearer ")) throw new HttpError(401, "missing_auth", "Sign in again.");
      const token = header.slice("Bearer ".length).trim();
      if (!token || token.startsWith("dev:")) throw new HttpError(401, "invalid_auth", "Sign in again.");
      const { getAuth } = await import("firebase-admin/auth");
      try {
        const decoded = await getAuth().verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email ?? null };
      } catch {
        throw new HttpError(401, "invalid_auth", "Sign in again.");
      }
    }
  };
}

/** Dev tokens never work on Cloud Functions or in production, even if the env flag is copied by mistake. */
export function devAuthAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ALLOW_DEV_AUTH !== "true") return false;
  if (env.NODE_ENV === "production") return false;
  if (env.K_SERVICE || env.FUNCTION_TARGET || env.FUNCTION_NAME) return false;
  return true;
}
