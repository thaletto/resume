import { test } from "bun:test";
import { Command, click, expect, given, label, role, scene, text, type } from "foldkit/scene";
import { Load, SavePreferences } from "./commands";
import { init, update, view } from "./main";
import { Message } from "./message";
import { emptySnapshot } from "./model";
import { modifyFields } from "foldkit/struct";

test("candidate preferences are edited, saved and isolated through the Foldkit view", () => {
  const snapshot = emptySnapshot();
  scene({ update, view },
    given(modifyFields(init().model, { loading: () => false })),
    click(role("button", { name: "Refresh" })),
    Command.resolve(Load, Message.Loaded({ snapshot })),
    click(role("button", { name: "Preferences" })),
    type(label("Preferred location"), "Remote"),
    click(role("button", { name: "Save preferences" })),
    Command.expectExact(SavePreferences),
    Command.resolve(SavePreferences, Message.Saved({ snapshot: { ...snapshot, preferences: { ...snapshot.preferences, laxman: { ...snapshot.preferences.laxman, location: "Remote" } } }, person: "laxman", notice: "Preferences saved." })),
    expect(text("Preferences saved.")).toExist(),
    click(role("button", { name: "Sraya" })),
    expect(text("job-search/workspaces/sraya/state.json")).toExist(),
  );
});
