/**
 * Verifies the assertions from the new orchestration tests without
 * booting vitest. Useful when the local vitest install is hitting a
 * Node EAGAIN startup error — the test logic itself is unrelated.
 *
 * Run:
 *   npx tsx scripts/verify-orchestration-tests.ts
 */
import { SYNTHESIS_TOOLS, dispatchTool } from "../lib/openai/tools";

let failed = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}`, detail ?? "");
  }
}

async function main() {
  console.log("synthesis tool specs");

  const names = SYNTHESIS_TOOLS.map((t) => t.function.name).sort();
  check(
    "exports the three agentic tools",
    JSON.stringify(names) ===
      JSON.stringify([
        "get_prior_analyses",
        "lookup_competitors",
        "search_uploaded_docs",
      ]),
    names,
  );

  const lookup = SYNTHESIS_TOOLS.find(
    (t) => t.function.name === "lookup_competitors",
  );
  const lookupReq = (lookup?.function.parameters as { required?: string[] })?.required;
  check(
    "lookup_competitors has required ['names']",
    JSON.stringify(lookupReq) === JSON.stringify(["names"]),
    lookupReq,
  );

  const search = SYNTHESIS_TOOLS.find(
    (t) => t.function.name === "search_uploaded_docs",
  );
  const searchReq = (search?.function.parameters as { required?: string[] })?.required;
  check(
    "search_uploaded_docs has required ['query']",
    JSON.stringify(searchReq) === JSON.stringify(["query"]),
    searchReq,
  );

  console.log("\ndispatchTool error paths");

  const unknown = await dispatchTool("does_not_exist", "{}", {
    startupId: "s",
    analysisId: "a",
  });
  check(
    "unknown tool name → ok=false",
    unknown.ok === false,
    unknown,
  );
  check(
    "unknown tool name → error matches /unknown_tool/i",
    typeof unknown.error === "string" && /unknown_tool/i.test(unknown.error),
    unknown.error,
  );

  const badJson = await dispatchTool("lookup_competitors", "{not json", {
    startupId: "s",
    analysisId: "a",
  });
  check(
    "invalid arguments JSON → ok=false",
    badJson.ok === false,
    badJson,
  );

  console.log(`\n${failed === 0 ? "ALL PASS" : `FAILED: ${failed}`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify script crashed:", e);
  process.exit(1);
});
