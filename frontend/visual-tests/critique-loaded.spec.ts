// VRT spec — Critique loaded pre-submit (D-02 surface 8, new in this phase).
//
// Hero state per D-02b: critique-mode conversation, 3 files loaded into all
// 3 slots, instruction typed in the textarea, NOT yet submitted (no
// streaming spinner state).
//
// Path (a) chosen — `setInputFiles()` injection. DropZoneSlot uses a
// standard <input type="file"> (verified in DropZoneSlot.jsx:103), so
// Playwright can drive the actual UI code path that production users hit.
// The alternative path (b) would have been a pre-built
// fixtures/critique-conversation.json loaded via page.route(), but that
// would have bypassed handleFile in CritiqueWelcome.jsx and produced a
// baseline that doesn't exercise the real mount logic. Path (a) is the
// stronger baseline.
import { test, expect, settle } from './_fixtures';

const CONVERSATION_ID = '00000000-0000-0000-0000-000000000004';

const conversationList = [
  {
    id: CONVERSATION_ID,
    title: 'VRT critique-loaded fixture',
    created_at: '2026-05-11T00:00:00Z',
    message_count: 0,
    mode: 'critique',
  },
];

const emptyCritiqueConversation = {
  id: CONVERSATION_ID,
  schema_version: 2,
  mode: 'critique',
  title: 'VRT critique-loaded fixture',
  created_at: '2026-05-11T00:00:00Z',
  messages: [],
};

const MODEL_A_CONTENT =
  '# Model A research notes\n\nMethodology: surveyed 12 BI architectures in pharma between 2022-2025.\nFinding 1: country-on-fact is the dominant pattern (10/12).\nFinding 2: currency-as-fact-column adoption split (6/12).\n';
const MODEL_B_CONTENT =
  '# Model B research notes\n\nReviewed 8 production data warehouses at top-20 pharma companies.\nMost adopted star schemas with explicit dim_market separation.\nKey insight: SCD Type 2 on dim_product is widespread for regulatory-driven SKUs.\n';
const MODEL_C_CONTENT =
  '# Model C research notes\n\nCovered 15 implementations across CDMO and biotech.\nObservation: PEQ modelling diverges sharply — some use categorical, some dimensional.\nRecommendation: align with how the analytics team consumes PEQ in dashboards.\n';

test('critique-loaded', async ({ page }) => {
  await page.route('**/api/conversations', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(conversationList),
    })
  );
  await page.route(`**/api/conversations/${CONVERSATION_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyCritiqueConversation),
    })
  );
  await page.route('**/api/stats/cost', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current_month: { queries: 0, total_usd: 0, upstream_total_usd: 0 } }),
    })
  );

  await page.goto('/');
  // App.jsx renders the mobile SidebarDrawer's <Sidebar> (display:none at
  // desktop widths) BEFORE the desktop <Sidebar>; the first matching node
  // in document order is hidden. Filter for visibility.
  await page.locator('.conversation-item:visible').first().click();
  // Wait for the critique welcome form to mount.
  await page.locator('.critique-welcome').waitFor({ state: 'visible' });

  // Inject 3 deterministic files into the 3 dropzone slots. Each DropZoneSlot
  // renders its own <input type="file"> (display:none — setInputFiles works
  // on hidden inputs by design); they are addressable in document order via
  // .drop-zone-slot input[type="file"].
  const fileInputs = page.locator('.drop-zone-slot input[type="file"]');
  await fileInputs.nth(0).setInputFiles({
    name: 'model-a-notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(MODEL_A_CONTENT, 'utf-8'),
  });
  await fileInputs.nth(1).setInputFiles({
    name: 'model-b-notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(MODEL_B_CONTENT, 'utf-8'),
  });
  await fileInputs.nth(2).setInputFiles({
    name: 'model-c-notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(MODEL_C_CONTENT, 'utf-8'),
  });

  // Type the critique instruction. Use .fill() rather than .type() because
  // .fill() is instantaneous (no keystroke animation) which keeps the
  // baseline stable across runs.
  await page
    .locator('textarea.critique-welcome__instruction')
    .fill(
      'Evaluate the depth of each research file and flag any missing primary sources.'
    );

  // Wait for the Submit button to become enabled (canSubmit = hasFile &&
  // hasInstruction && !hasError && !isLoading). This is the pre-submit
  // hero state per D-02b — do NOT click Submit.
  await page
    .locator('button.critique-welcome__submit:not([disabled])')
    .waitFor({ state: 'visible' });

  await settle(page);

  await expect(page).toHaveScreenshot('critique-loaded.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
