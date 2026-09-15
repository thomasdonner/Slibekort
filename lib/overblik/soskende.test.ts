import { describe, expect, it } from "vitest";
import { findSoskendeIds } from "./soskende";

describe("findSoskendeIds", () => {
  it("finder en søskende der deler en voksen", () => {
    const relationer = [
      { spillerId: "anders", voksenId: "mor" },
      { spillerId: "andrea", voksenId: "mor" },
    ];
    expect(findSoskendeIds(relationer, "anders")).toEqual(["andrea"]);
  });

  it("finder ingen søskende uden delte voksne", () => {
    const relationer = [
      { spillerId: "anders", voksenId: "mor" },
      { spillerId: "bo", voksenId: "far-til-bo" },
    ];
    expect(findSoskendeIds(relationer, "anders")).toEqual([]);
  });

  it("tæller ikke spilleren selv med", () => {
    const relationer = [{ spillerId: "anders", voksenId: "mor" }];
    expect(findSoskendeIds(relationer, "anders")).toEqual([]);
  });

  it("finder søskende delt via en af flere voksne", () => {
    const relationer = [
      { spillerId: "anders", voksenId: "mor" },
      { spillerId: "anders", voksenId: "far" },
      { spillerId: "andrea", voksenId: "far" },
    ];
    expect(findSoskendeIds(relationer, "anders")).toEqual(["andrea"]);
  });

  it("returnerer hver søskende kun én gang, selv med flere delte voksne", () => {
    const relationer = [
      { spillerId: "anders", voksenId: "mor" },
      { spillerId: "anders", voksenId: "far" },
      { spillerId: "andrea", voksenId: "mor" },
      { spillerId: "andrea", voksenId: "far" },
    ];
    expect(findSoskendeIds(relationer, "anders")).toEqual(["andrea"]);
  });

  it("finder flere søskende på tværs af tre børn", () => {
    const relationer = [
      { spillerId: "anders", voksenId: "mor" },
      { spillerId: "andrea", voksenId: "mor" },
      { spillerId: "asger", voksenId: "mor" },
    ];
    expect(findSoskendeIds(relationer, "anders").sort()).toEqual([
      "andrea",
      "asger",
    ]);
  });
});
