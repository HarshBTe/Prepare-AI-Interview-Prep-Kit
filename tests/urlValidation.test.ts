import { describe, expect, it } from "vitest";
import {
  InvalidCompanyUrlError,
  validateCompanyUrl,
} from "../src/lib/validation/urlValidation";

describe("Company URL validation", () => {
  it("should accept a valid HTTPS URL", async () => {
    const url = await validateCompanyUrl(
      "https://example.com"
    );

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("example.com");
  });

  it("should reject invalid URLs", async () => {
    await expect(
      validateCompanyUrl("not-a-url")
    ).rejects.toBeInstanceOf(InvalidCompanyUrlError);
  });

  it("should reject non HTTP/HTTPS protocols", async () => {
    await expect(
      validateCompanyUrl("ftp://example.com")
    ).rejects.toThrow(
      "Only HTTP and HTTPS URLs are allowed"
    );
  });

  it("should reject localhost", async () => {
    await expect(
      validateCompanyUrl("http://localhost:5000")
    ).rejects.toThrow(
      "Private or local URLs are not allowed"
    );
  });

  it("should reject loopback IP addresses", async () => {
    await expect(
      validateCompanyUrl("http://127.0.0.1")
    ).rejects.toThrow(
      "Private or loopback IP addresses are not allowed"
    );
  });

  it("should reject private IP addresses", async () => {
    await expect(
      validateCompanyUrl("http://192.168.1.10")
    ).rejects.toThrow(
      "Private or loopback IP addresses are not allowed"
    );
  });

  it("should reject URLs containing credentials", async () => {
    await expect(
      validateCompanyUrl(
        "https://user:password@example.com"
      )
    ).rejects.toThrow(
      "URLs containing credentials are not allowed"
    );
  });
});