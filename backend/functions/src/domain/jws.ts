import { createVerify, X509Certificate, type KeyObject } from "node:crypto";

export function b64urlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export function derToRaw(der: Buffer): Buffer {
  let offset = 0;
  if (der[offset] !== 0x30) throw new Error("der_sequence");
  offset += 1;
  if (der[offset] & 0x80) {
    offset += 1 + (der[offset] & 0x7f);
  } else {
    offset += 1;
  }
  const readInt = () => {
    if (der[offset] !== 0x02) throw new Error("der_int");
    const length = der[offset + 1];
    const start = offset + 2;
    offset = start + length;
    let bytes = der.subarray(start, start + length);
    if (bytes[0] === 0x00) bytes = bytes.subarray(1);
    if (bytes.length > 32) throw new Error("der_int_long");
    const fixed = Buffer.alloc(32);
    bytes.copy(fixed, 32 - bytes.length);
    return fixed;
  };
  const r = readInt();
  const s = readInt();
  return Buffer.concat([r, s]);
}

export function rawToDer(raw: Buffer): Buffer {
  if (raw.length !== 64) throw new Error("raw_sig_len");
  const part = (start: number) => {
    let bytes = raw.subarray(start, start + 32);
    let index = 0;
    while (index < bytes.length - 1 && bytes[index] === 0) index += 1;
    bytes = bytes.subarray(index);
    if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
    return Buffer.concat([Buffer.from([0x02, bytes.length]), bytes]);
  };
  const body = Buffer.concat([part(0), part(32)]);
  if (body.length > 127) throw new Error("der_len");
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

export class JwsError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function certValid(cert: X509Certificate, now: Date): boolean {
  const from = Date.parse(cert.validFrom);
  const to = Date.parse(cert.validTo);
  const time = now.getTime();
  return time + 60_000 >= from && time - 60_000 <= to;
}

export interface VerifiedJws<T> {
  header: Record<string, unknown>;
  payload: T;
}

/**
 * Verify an ES256 JWS whose x5c chain ends at one of the pinned roots.
 * StoreKit 2 signed transactions use this shape. The root is not taken from the untrusted header.
 */
export function verifyEs256Jws<T>(jws: string, trustedRootsPem: string[], now: Date): VerifiedJws<T> {
  const parts = jws.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) throw new JwsError("malformed_jws");
  const [encodedHeader, encodedPayload, encodedSig] = parts;
  let header: { alg?: string; x5c?: string[] };
  try {
    header = JSON.parse(b64urlDecode(encodedHeader).toString("utf8")) as { alg?: string; x5c?: string[] };
  } catch {
    throw new JwsError("malformed_header");
  }
  if (header.alg !== "ES256") throw new JwsError("unsupported_alg");
  if (!Array.isArray(header.x5c) || header.x5c.length < 2 || header.x5c.length > 5) throw new JwsError("bad_cert_chain");

  let certs: X509Certificate[];
  try {
    certs = header.x5c.map((encoded) => new X509Certificate(Buffer.from(encoded, "base64")));
  } catch {
    throw new JwsError("bad_certificate");
  }
  if (certs.some((cert) => !certValid(cert, now))) throw new JwsError("cert_expired");

  for (let index = 0; index < certs.length - 1; index += 1) {
    if (!certs[index].verify(certs[index + 1].publicKey)) throw new JwsError("broken_chain");
  }

  const roots = trustedRootsPem.map((pem) => new X509Certificate(pem));
  const last = certs[certs.length - 1];
  const anchored = roots.some(
    (root) => last.fingerprint256 === root.fingerprint256 || last.verify(root.publicKey)
  );
  if (!anchored) throw new JwsError("untrusted_root");

  const signature = b64urlDecode(encodedSig);
  if (signature.length !== 64) throw new JwsError("bad_signature");
  const verifier = createVerify("SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const key: KeyObject = certs[0].publicKey;
  if (!verifier.verify(key, rawToDer(signature))) throw new JwsError("bad_signature");

  try {
    return { header, payload: JSON.parse(b64urlDecode(encodedPayload).toString("utf8")) as T };
  } catch {
    throw new JwsError("malformed_payload");
  }
}
