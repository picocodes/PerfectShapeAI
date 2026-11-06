import { createSign, generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAppStoreJwt } from "../iap/appStoreJwt.js";
import { b64urlDecode, derToRaw, rawToDer, verifyEs256Jws } from "./jws.js";
import { makeTestPki } from "../testing/pki.js";

describe("StoreKit JWS", () => {
  const pki = makeTestPki();

  it("accepts a chained ES256 transaction and rejects tampering", () => {
    const now = new Date();
    const token = pki.sign({
      productId: "perfectshape_plus_monthly",
      bundleId: "com.perfectshapeai.app",
      expiresDate: Date.parse("2027-01-01T00:00:00Z")
    });
    const verified = verifyEs256Jws<{ productId: string }>(token, [pki.rootPem], now);
    expect(verified.payload.productId).toBe("perfectshape_plus_monthly");

    const [header, payload, signature] = token.split(".");
    const flipped = `${header}.${payload.slice(0, -2)}${payload.endsWith("a") ? "b" : "a"}.${signature}`;
    expect(() => verifyEs256Jws(flipped, [pki.rootPem], now)).toThrow(/bad_signature|malformed_payload/);
    expect(() => verifyEs256Jws(token, [makeTestPki().rootPem], now)).toThrow(/untrusted_root/);
  });
});

describe("App Store Server API JWT", () => {
  it("signs a short-lived ES256 bearer the way Apple expects", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = createAppStoreJwt({
      issuerId: "issuer",
      keyId: "KEY123",
      privateKey: pem,
      bundleId: "com.perfectshapeai.app",
      nowSec: 1_700_000_000
    });
    const [header, payload, signature] = jwt.split(".");
    const decodedHeader = JSON.parse(b64urlDecode(header).toString("utf8")) as { alg: string; kid: string };
    const decodedPayload = JSON.parse(b64urlDecode(payload).toString("utf8")) as { aud: string; bid: string; exp: number };
    expect(decodedHeader).toMatchObject({ alg: "ES256", kid: "KEY123" });
    expect(decodedPayload.aud).toBe("appstoreconnect-v1");
    expect(decodedPayload.bid).toBe("com.perfectshapeai.app");
    expect(decodedPayload.exp - 1_700_000_000).toBe(600);
    const verifier = createVerify("SHA256");
    verifier.update(`${header}.${payload}`);
    verifier.end();
    expect(verifier.verify(publicKey, rawToDer(b64urlDecode(signature)))).toBe(true);
    expect(derToRaw(rawToDer(b64urlDecode(signature))).equals(b64urlDecode(signature))).toBe(true);
    expect(createSign).toBeTypeOf("function");
  });
});
