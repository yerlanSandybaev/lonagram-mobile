import { describe, expect, it } from "vitest";
import { oauthCode, MOBILE_AUTH_REDIRECT } from "./oauth-callback";
import { notificationRoute } from "./notification-route";
import { onboardingFields } from "./onboarding-input";

describe("mobile redirects and shared profile input", () => {
  it("accepts only the registered PKCE callback", () => {
    expect(oauthCode(`${MOBILE_AUTH_REDIRECT}?code=fixture%2Bcode`)).toBe("fixture+code");
    for (const url of ["https://evil.example/?code=fixture", "lonagram://auth/other?code=fixture", `${MOBILE_AUTH_REDIRECT}?error=access_denied`, MOBILE_AUTH_REDIRECT]) expect(() => oauthCode(url)).toThrow();
  });
  it("maps known web notification targets without opening external URLs", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(notificationRoute(`/messages/${id}`)).toBe(`/chat/${id}`);
    expect(notificationRoute(`/twins/${id}`)).toBe(`/twin-chat/${id}`);
    expect(notificationRoute("/dating")).toBe("/");
    for (const href of [null, "//evil.example", "https://evil.example", "/unknown", "/messages/../../settings"]) expect(notificationRoute(href)).toBeNull();
  });
  it("keeps advanced Twin settings but excludes identity and publication fields", () => {
    expect(onboardingFields({ id: "actor", username: "tester", onboardingComplete: true }, { userId: "actor", neverDisclose: ["private"], enabled: true })).toEqual({ username: "tester", neverDisclose: ["private"] });
  });
});
