import { createSign } from "node:crypto";
import { derToRaw } from "../domain/jws.js";

export function createAppStoreJwt(input: {
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  nowSec: number;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: input.keyId, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: input.issuerId,
      iat: input.nowSec,
      exp: input.nowSec + 600,
      aud: "appstoreconnect-v1",
      bid: input.bundleId
    })
  ).toString("base64url");
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const raw = derToRaw(signer.sign(input.privateKey));
  return `${header}.${payload}.${raw.toString("base64url")}`;
}

export function latestSignedTransactions(body: unknown): string[] {
  const data = body as {
    data?: { lastTransactions?: { signedTransactionInfo?: string }[] }[];
  };
  const signed: string[] = [];
  for (const group of data.data ?? []) {
    for (const item of group.lastTransactions ?? []) {
      if (item.signedTransactionInfo) signed.push(item.signedTransactionInfo);
    }
  }
  return signed;
}
