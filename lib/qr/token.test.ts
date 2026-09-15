import { describe, expect, it } from "vitest";
import { udtraekQrToken } from "./token";

describe("udtraekQrToken", () => {
  it("trækker token ud af en fuld betalingsurl", () => {
    expect(
      udtraekQrToken("https://slibekort.aalborgishockey.dk/betal/abc123"),
    ).toBe("abc123");
  });

  it("virker med et bart token uden skråstreger", () => {
    expect(udtraekQrToken("abc123")).toBe("abc123");
  });

  it("ignorerer en efterfølgende skråstreg", () => {
    expect(
      udtraekQrToken("https://slibekort.aalborgishockey.dk/betal/abc123/"),
    ).toBe("abc123");
  });

  it("ignorerer query-parametre og fragmenter", () => {
    expect(
      udtraekQrToken("https://slibekort.aalborgishockey.dk/betal/abc123?ref=x#top"),
    ).toBe("abc123");
  });

  it("trimmer omgivende blanktegn fra manuel indtastning", () => {
    expect(udtraekQrToken("  abc123  ")).toBe("abc123");
  });
});
