import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES, matchesPrefix, routes, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/perfil")).toBe("/perfil");
    expect(safeNextPath("/u/ana?aba=posts")).toBe("/u/ana?aba=posts");
  });

  it("bloqueia open redirect", () => {
    expect(safeNextPath("https://malicioso.com")).toBe(routes.feed);
    expect(safeNextPath("//malicioso.com")).toBe(routes.feed);
    expect(safeNextPath("/\\malicioso.com")).toBe(routes.feed);
    expect(safeNextPath("javascript:alert(1)")).toBe(routes.feed);
    expect(safeNextPath(null)).toBe(routes.feed);
  });
});

describe("matchesPrefix", () => {
  it("protege a rota e as subrotas, sem falsos positivos", () => {
    expect(matchesPrefix("/perfil", PROTECTED_PREFIXES)).toBe(true);
    expect(matchesPrefix("/configuracoes/conta", PROTECTED_PREFIXES)).toBe(true);
    expect(matchesPrefix("/perfilfalso", PROTECTED_PREFIXES)).toBe(false);
    expect(matchesPrefix("/u/ana", PROTECTED_PREFIXES)).toBe(false);
  });
});
