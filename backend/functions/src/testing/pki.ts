import { execFileSync } from "node:child_process";
import { createSign } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { derToRaw } from "../domain/jws.js";

function pemBody(pem: string): string {
  return pem.replace(/-----BEGIN CERTIFICATE-----/g, "").replace(/-----END CERTIFICATE-----/g, "").replace(/\s+/g, "");
}

/** A tiny CA chain so tests can sign StoreKit-shaped JWS documents without Apple. */
export function makeTestPki() {
  const dir = mkdtempSync(join(tmpdir(), "ps-pki-"));
  const run = (args: string[]) => execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "root.key"]);
  run(["req", "-new", "-x509", "-key", "root.key", "-out", "root.pem", "-days", "3650", "-subj", "/CN=Test Root"]);
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "mid.key"]);
  run(["req", "-new", "-key", "mid.key", "-out", "mid.csr", "-subj", "/CN=Test Intermediate"]);
  run(["x509", "-req", "-in", "mid.csr", "-CA", "root.pem", "-CAkey", "root.key", "-CAcreateserial", "-out", "mid.pem", "-days", "3650"]);
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "leaf.key"]);
  run(["req", "-new", "-key", "leaf.key", "-out", "leaf.csr", "-subj", "/CN=Test Leaf"]);
  run(["x509", "-req", "-in", "leaf.csr", "-CA", "mid.pem", "-CAkey", "mid.key", "-CAcreateserial", "-out", "leaf.pem", "-days", "3650"]);

  const rootPem = readFileSync(join(dir, "root.pem"), "utf8");
  const midPem = readFileSync(join(dir, "mid.pem"), "utf8");
  const leafPem = readFileSync(join(dir, "leaf.pem"), "utf8");
  const leafKey = readFileSync(join(dir, "leaf.key"), "utf8");

  const sign = (payload: Record<string, unknown>) => {
    const header = { alg: "ES256", x5c: [pemBody(leafPem), pemBody(midPem)] };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signer = createSign("SHA256");
    signer.update(`${encodedHeader}.${encodedPayload}`);
    signer.end();
    const raw = derToRaw(signer.sign(leafKey));
    return `${encodedHeader}.${encodedPayload}.${raw.toString("base64url")}`;
  };

  return { rootPem, sign };
}
