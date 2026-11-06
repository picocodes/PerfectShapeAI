import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function loadAppleRoots(): string[] {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "../../certs");
  return [readFileSync(join(dir, "AppleRootCA-G3.pem"), "utf8"), readFileSync(join(dir, "AppleRootCA-G2.pem"), "utf8")];
}
