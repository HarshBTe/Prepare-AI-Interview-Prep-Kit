// src/lib/validation/urlValidation.ts

import dns from "node:dns/promises";
import net from "node:net";

export class InvalidCompanyUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCompanyUrlError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return isPrivateIPv4(ip);
  }

  if (version === 6) {
    return isPrivateIPv6(ip);
  }

  return false;
}

export async function validateCompanyUrl(
  input: string
): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new InvalidCompanyUrlError("Invalid company URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new InvalidCompanyUrlError(
      "Only HTTP and HTTPS URLs are allowed"
    );
  }

  if (url.username || url.password) {
    throw new InvalidCompanyUrlError(
      "URLs containing credentials are not allowed"
    );
  }

  const hostname = url.hostname.toLowerCase();

  const blockedHostnames = new Set([
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
  ]);

  if (blockedHostnames.has(hostname)) {
    throw new InvalidCompanyUrlError(
      "Private or local URLs are not allowed"
    );
  }

  // If the hostname itself is an IP address,
  // reject private/loopback addresses immediately.
  if (isPrivateIp(hostname)) {
    throw new InvalidCompanyUrlError(
      "Private or loopback IP addresses are not allowed"
    );
  }

  // Resolve DNS and check every resolved address.
  try {
    const addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    for (const address of addresses) {
      if (isPrivateIp(address.address)) {
        throw new InvalidCompanyUrlError(
          "The company URL resolves to a private or loopback IP address"
        );
      }
    }
  } catch (error) {
    if (error instanceof InvalidCompanyUrlError) {
      throw error;
    }

    throw new InvalidCompanyUrlError(
      "Unable to resolve company URL"
    );
  }

  return url;
}