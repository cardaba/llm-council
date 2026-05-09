---
status: partial
phase: 01-hardening-conversation-management
source: [01-VERIFICATION.md]
started: 2026-05-09T00:00:00Z
updated: 2026-05-09T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Hover ⋮ trigger + Rename above Delete
expected: Visual progressive disclosure of menu trigger; menu opens at click position; Rename converts row to input with title selected and focused
result: [pending]

### 2. Rename persistence across F5
expected: After F5, conversation renamed to 'Test Rename' still shows 'Test Rename' in the sidebar
result: [pending]

### 3. Escape during rename — no PATCH fires
expected: Title reverts on Escape; Network panel shows zero PATCH calls
result: [pending]

### 4. Search debounce timing
expected: Typing 'abcdef' rapidly does NOT update list per-keystroke; filter applies once after ~200ms pause
result: [pending]

### 5. Content fallback affordance + lazy load
expected: Query with no title matches and ≥3 chars shows 'Search inside content (N conversations)' affordance; clicking it surfaces content matches via Promise.all of api.getConversation
result: [pending]

### 6. Pitfall 6 seal — selected conversation stays visible when filtered out
expected: Selected conversation remains in central panel even when sidebar filter hides its row; clearing query brings row back
result: [pending]

### 7. Right-click suppresses native context menu
expected: preventDefault works; custom Menu opens at cursor position; native browser menu does not appear
result: [pending]

### 8. Modal focus trap + ESC + focus restoration
expected: Tab cycles between Cancel and Delete without escaping; ESC closes modal and returns focus to the ⋮ trigger
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
