// Shared e2e helpers: the Groq mock (route interception — no real
// network, no real key anywhere) and tiny page flows.

export const sse = (text) =>
  text
    .match(/.{1,20}/gs)
    .map((chunk) => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`)
    .join("") + "data: [DONE]\n\n";

// Intercepts every Groq call the app can make and answers from the
// prompt's own markers — a plan for plan prompts, plain wording for
// explain prompts. The mock never echoes numbers, so the number
// checker has nothing to flag.
export async function mockGroq(page) {
  await page.route("https://api.groq.com/**", async (route) => {
    const body = route.request().postDataJSON();
    const prompt = body?.messages?.map((m) => m.content).join("\n") || "";
    let reply;
    if (prompt.includes("JSON calculation plan")) {
      const q = (prompt.match(/Question: "([^"]*)"\s*$/) || [])[1] || "";
      const groupBy = /by category/i.test(q) ? "category" : "region";
      reply = JSON.stringify({
        type: "plan",
        plan: {
          groupBy: [groupBy],
          measures: [{ op: "sum", column: "revenue", as: "total_revenue" }],
          sort: { by: "total_revenue", dir: "desc" },
        },
      });
    } else if (prompt.includes("already ran this calculation")) {
      reply = "The leading group tops the table, with the rest trailing behind it. The full result is shown in the table below.";
    } else if (prompt.includes("dataset summary below")) {
      reply = "This dataset tracks sales across regions and products over the year.";
    } else {
      reply = "Here is a short summary of the calculated figures, written without repeating any of them.";
    }
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse(reply),
    });
  });
}

export async function enterDemo(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
}

// Demo mode never calls the AI — Ask needs a key in the UI. The
// value is a placeholder; every request is intercepted by mockGroq.
export async function enterWithMockKey(page) {
  await mockGroq(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Launch LUMIQ" }).click();
  await page.getByPlaceholder("Paste your Groq API key").fill("gsk_e2e_placeholder_not_a_real_key");
  await page.getByRole("button", { name: "Launch LUMIQ →" }).click();
}
