import { describe, expect, it } from "vitest";
import {
  kanAdministrereBrugere,
  kanRetteSaldi,
  kanSeAlleHold,
  kanSeHold,
  type BrugerAdgang,
} from "./roller";

describe("kanSeHold", () => {
  it("kasserer ser alle hold, også et de ikke selv er tildelt", () => {
    const adgang: BrugerAdgang = { roller: ["kasserer"], hold: [] };
    expect(kanSeAlleHold(adgang)).toBe(true);
    expect(kanSeHold(adgang, "U14")).toBe(true);
  });

  it("administrator ser alle hold", () => {
    const adgang: BrugerAdgang = { roller: ["administrator"], hold: [] };
    expect(kanSeHold(adgang, "U14")).toBe(true);
  });

  it("holdleder ser kun tildelte hold", () => {
    const adgang: BrugerAdgang = { roller: ["holdleder"], hold: ["U14"] };
    expect(kanSeHold(adgang, "U14")).toBe(true);
    expect(kanSeHold(adgang, "U16")).toBe(false);
  });

  it("holdleder uden nogen tildelte hold ser ingen", () => {
    const adgang: BrugerAdgang = { roller: ["holdleder"], hold: [] };
    expect(kanSeHold(adgang, "U14")).toBe(false);
  });

  it("en kombineret sliber+holdleder-rolle ser kun tildelte hold", () => {
    const adgang: BrugerAdgang = { roller: ["sliber", "holdleder"], hold: ["U14"] };
    expect(kanSeHold(adgang, "U16")).toBe(false);
  });
});

describe("kanRetteSaldi", () => {
  it("kasserer og administrator kan rette saldi", () => {
    expect(kanRetteSaldi({ roller: ["kasserer"], hold: [] })).toBe(true);
    expect(kanRetteSaldi({ roller: ["administrator"], hold: [] })).toBe(true);
  });

  it("holdleder kan ikke rette saldi", () => {
    expect(kanRetteSaldi({ roller: ["holdleder"], hold: ["U14"] })).toBe(false);
  });
});

describe("kanAdministrereBrugere", () => {
  it("kun administrator kan give andre adgang", () => {
    expect(kanAdministrereBrugere({ roller: ["administrator"], hold: [] })).toBe(
      true,
    );
    expect(kanAdministrereBrugere({ roller: ["kasserer"], hold: [] })).toBe(false);
  });
});
