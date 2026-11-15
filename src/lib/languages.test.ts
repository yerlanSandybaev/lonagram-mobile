import { describe, expect, it, vi } from "vitest";
import { createCharacterApi } from "./characters";
import { MANROPE_MISSING, resolveFontFamily } from "./fonts";
import { createMobileApi, type MobileFetch } from "./mobile-api";
import { applyReply, beginSend, createPrivateTwinApi, initialChat } from "./private-twin";

// Every Twin answers in the language it is asked in. The app sends and shows text exactly as is.
const KAZAKH = "Сәлем, қалайсың? ә ғ қ ң ө ұ ү һ і";
const REPLY = "Сәлем! Жақсымын, рақмет. Өзің қалайсың?";
const session = async () => ({ access_token: "fixture-user-token", expires_at: Math.floor(Date.now() / 1000) + 3600 });

describe("any language, exactly as typed", () => {
  it("sends Kazakh to the server byte for byte and returns the reply unchanged", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: true, data: { id: "r", text: REPLY } }));
    const call = createMobileApi("https://lonagram.example", session, request);
    const reply = await call<{ text: string }>("twin.turn", { conversationId: "c", cue: KAZAKH }, "k");
    const body = JSON.parse(String(request.mock.calls[0]![1]!.body));
    expect(body.input.cue).toBe(KAZAKH);
    expect(reply.text).toBe(REPLY);
  });
  it("passes Kazakh unchanged to your own Twin and to a Character Twin", async () => {
    const call = vi.fn(async () => ({ id: "x", text: REPLY }));
    await createPrivateTwinApi(call as never, (_s, run) => run("k")).talk({ cue: KAZAKH, requestId: "11111111-1111-4111-8111-111111111111" });
    await createCharacterApi(call as never).send("aristotle", KAZAKH, "22222222-2222-4222-8222-222222222222");
    expect((call.mock.calls[0] as unknown[])[1]).toMatchObject({ cue: KAZAKH });
    expect((call.mock.calls[1] as unknown[])[1]).toMatchObject({ cue: KAZAKH });
  });
  it("shows the typed line and the Twin's reply exactly as they are", () => {
    const sent = beginSend(initialChat(null), KAZAKH, "a");
    const state = applyReply(sent.state, "a", KAZAKH, { text: REPLY });
    expect(state.lines.map((line) => line.text)).toEqual([KAZAKH, REPLY]);
  });
  it("uses the system font for messages, since Manrope lacks some Kazakh letters", () => {
    expect(resolveFontFamily({ fontWeight: "700" }, false, true)).toBeUndefined();
    expect(resolveFontFamily({ fontWeight: "700" })).toBe("Manrope_700Bold");
    expect(MANROPE_MISSING).toContain("қ");
  });
});
