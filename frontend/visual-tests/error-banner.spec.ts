// VRT spec — ErrorBanner (D-02 surface 3).
//
// Hero state: ErrorBanner is rendered above ChatInterface. The banner is
// controlled by App.streamError state which is set from the SSE 'error'
// event in App.handleStreamEvent. Driving that path from a black-box
// Playwright spec is brittle (depends on stream lifecycle timing), so we
// inject the React state directly by exposing a temporary global hook only
// when running under VRT — NO: instead, we mount the page, then evaluate
// JS that finds the React-managed root and dispatches a synthetic stream
// error via the api.sendMessageStream callback path.
//
// Simpler approach used here: we mock /api/conversations to return a single
// conversation, navigate to it, then mock the message-stream endpoint to
// emit an SSE `error` event so App.handleStreamEvent fires the banner
// through the real code path. To avoid driving the multipart submit form,
// we synthesise the error by calling the api directly from the browser
// context AFTER the conversation is loaded.
//
// The cleanest deterministic trigger is to render the page with an
// already-failed first turn by hydrating a conversation that contains an
// `error_banner` marker — but the app state machine ignores anything
// outside its known SSE-event branches. Therefore we instead set up
// page.exposeFunction + page.addInitScript to flag a "force banner" hook
// the app exposes when window.__VRT_FORCE_ERROR is set — but this requires
// app-side code changes outside this plan's files_modified.
//
// FALLBACK approach (chosen): drive the banner by intercepting the message
// stream endpoint and returning an SSE error event after the user submits.
// We auto-submit a tiny message via JS and let the error event flow into
// App.handleStreamEvent through the real code path. This keeps app code
// untouched and exercises the actual ErrorBanner mount path.
import { test, expect, settle } from './_fixtures';

const CONVERSATION_ID = '00000000-0000-0000-0000-000000000003';

const conversationList = [
  {
    id: CONVERSATION_ID,
    title: 'VRT error-banner fixture',
    created_at: '2026-05-11T00:00:00Z',
    message_count: 0,
    mode: 'fresh',
  },
];

const emptyConversation = {
  id: CONVERSATION_ID,
  schema_version: 2,
  mode: 'fresh',
  title: 'VRT error-banner fixture',
  created_at: '2026-05-11T00:00:00Z',
  messages: [],
};

test('error-banner', async ({ page }) => {
  await page.route('**/api/conversations', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(conversationList),
      });
    }
    return route.continue();
  });
  await page.route(`**/api/conversations/${CONVERSATION_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyConversation),
    })
  );
  await page.route('**/api/stats/cost', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current_month: { queries: 0, total_usd: 0, upstream_total_usd: 0 } }),
    })
  );
  // Message stream returns an immediate SSE 'error' event so App.handleStreamEvent
  // sets streamError and the ErrorBanner mounts above ChatInterface.
  await page.route(`**/api/conversations/${CONVERSATION_ID}/message/stream`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"error","message":"Synthetic VRT error"}\n\n',
    })
  );

  await page.goto('/');
  // Select the fixture conversation so ChatInterface mounts the input form.
  await page.locator('.conversation-item').first().click();
  // Submit a tiny message to trigger the stream → which immediately errors.
  await page.locator('textarea.message-input').fill('vrt');
  await page.locator('button.send-button').click();

  // Wait for the banner to mount before settling.
  await page.locator('.error-banner').waitFor({ state: 'visible' });
  await settle(page);

  await expect(page).toHaveScreenshot('error-banner.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
