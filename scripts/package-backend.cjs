const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const web = path.resolve(__dirname, "../../lonagram-web-reference");
const mobile = path.resolve(__dirname, "..");
const tracked = ["src/db/supabase-store.ts", "src/domain/schemas.ts", "src/domain/service.ts"];
const added = ["src/app/api/mobile/v1/route.ts", "src/server/mobile-contract.ts", "src/server/mobile-handler.ts", "src/server/mobile-handler.test.ts", "supabase/migrations/20261023052502_mobile_request_idempotency.sql"];
const options = { cwd: web, encoding: "utf8", windowsHide: true };
let patch = execFileSync("git", ["-c", `safe.directory=${web.replace(/\\/g, "/")}`, "diff", "--binary", "--", ...tracked], options).replace(/\r\n/g, "\n");
for (const file of added) {
  const content = fs.readFileSync(path.join(web, file), "utf8").replace(/\r\n/g, "\n");
  const lines = content.replace(/\n$/, "").split("\n");
  patch += `diff --git a/${file} b/${file}\nnew file mode 100644\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => "+" + line).join("\n")}\n`;
}
fs.writeFileSync(path.join(mobile, "docs/backend-integration.patch"), patch);
const commit = execFileSync("git", ["-c", `safe.directory=${web.replace(/\\/g, "/")}`, "rev-parse", "HEAD"], options).trim();
fs.writeFileSync(path.join(mobile, "docs/backend-base.txt"), `Repository: https://github.com/yerlanSandybaev/lonagram\nBase commit: ${commit}\nLocal checkout: ../lonagram-web-reference\nPatch: backend-integration.patch\nStatus: local, uncommitted, migration not applied, not deployed\n`);
console.log(`Packaged ${tracked.length + added.length} backend files against ${commit}.`);
