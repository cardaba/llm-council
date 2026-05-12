import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import Menu from './Menu';
import Modal from './Modal';
import './Sidebar.css';

/**
 * Inline rename input. Mounted ONLY while `isEditing===true`; unmounted on
 * commit/cancel. Because the component instance is fresh every time the user
 * picks Rename, `draftTitle` initialises from the current title naturally —
 * no reset useEffect, no stale-draft race across rapid menu clicks.
 *
 * Race resolution per RESEARCH §Pattern 4: Enter / Escape / Blur all funnel
 * through `handleBlur` via `e.target.blur()`. The keydown handler sets
 * `intentRef.current` to 'commit' or 'cancel' BEFORE triggering blur, so the
 * (later-firing) blur handler reads the intent and decides commit vs cancel
 * with no double-fire. A "natural" blur (click outside) leaves intent at null
 * which falls through to the commit branch — D-06 says blur commits.
 */
function RenameInput({ conv, onCommitRename, onCancelRename }) {
  const [draftTitle, setDraftTitle] = useState(conv.title || '');
  const intentRef = useRef(null); // 'commit' | 'cancel' | null
  const inputRef = useRef(null);

  // Autofocus + select-all on mount (Finder / ChatGPT convention: user can
  // type a brand-new title immediately without clearing first).
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      intentRef.current = 'commit';
      e.target.blur(); // single exit path → handleBlur reads intent
    } else if (e.key === 'Escape') {
      e.preventDefault();
      intentRef.current = 'cancel';
      e.target.blur();
    }
  };

  const handleBlur = () => {
    if (intentRef.current === 'cancel') {
      onCancelRename();
    } else {
      // Commit branch (Enter or natural blur). Trim + reject empty/unchanged
      // silently — no PATCH, no UI error, just exit edit mode.
      const trimmed = draftTitle.trim();
      if (trimmed && trimmed !== (conv.title || '')) {
        onCommitRename(conv.id, trimmed);
      } else {
        onCancelRename();
      }
    }
    intentRef.current = null;
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className="conversation-title-input"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        maxLength={200}
        aria-label="Conversation title"
      />
      <p className="sidebar__rename-hint">
        Enter para guardar · Esc para cancelar
      </p>
    </>
  );
}

/**
 * One sidebar row. Holds no rename state of its own — that lives inside
 * `RenameInput`, which is mounted only while `isEditing===true` so its
 * lifetime matches the edit session and there is no stale draft to clear.
 */
function ConversationItem({
  conv,
  isActive,
  isEditing,
  isMenuOpen,
  onSelect,
  onContextMenu,
  onMenuTriggerClick,
  onCommitRename,
  onCancelRename,
}) {
  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={isEditing ? undefined : onSelect}
      onContextMenu={isEditing ? undefined : onContextMenu}
    >
      <div className="conversation-content">
        {isEditing ? (
          <RenameInput
            conv={conv}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
          />
        ) : (
          <>
            <div className="conversation-title">
              {conv.title || 'New Conversation'}
              {conv.mode === 'critique' && (
                <span className="conversation-pill">Critique</span>
              )}
            </div>
            {conv.message_count > 0 && (
              <div className="conversation-meta">
                • {conv.message_count}
              </div>
            )}
          </>
        )}
      </div>
      {!isEditing && (
        <button
          type="button"
          className="menu-trigger"
          aria-label={`Actions for ${conv.title || 'conversation'}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={onMenuTriggerClick}
        >
          ⋮
        </button>
      )}
    </div>
  );
}

// Date bucket math runs entirely in local time. Bucket boundaries (D-04):
// - Today: same calendar day as `now`
// - This week: previous 6 calendar days (i.e. now-6d .. now-1d, exclusive of today)
// - This month: rest of the current calendar month (before the 7-day window above)
// - Older: anything else
function bucketFor(createdAtIso, now) {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return 'Older';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const created = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today - created) / dayMs);
  if (diffDays <= 0) return 'Today';
  if (diffDays <= 6) return 'This week';
  if (created.getFullYear() === today.getFullYear() && created.getMonth() === today.getMonth()) return 'This month';
  return 'Older';
}

const BUCKET_ORDER = ['Today', 'This week', 'This month', 'Older'];

function groupByDateBucket(conversations, now) {
  const map = new Map();
  for (const conv of conversations) {
    const bucket = bucketFor(conv.created_at, now);
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket).push(conv);
  }
  // Preserve `BUCKET_ORDER` ordering; within a bucket, keep the input order
  // (the backend already returns conversations sorted desc by created_at).
  return BUCKET_ORDER
    .filter((b) => map.has(b))
    .map((b) => ({ bucket: b, items: map.get(b) }));
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onNewCritiqueConversation,
  onDeleteConversation,
  onRenameConversation,
  refreshTrigger = 0,
}) {
  // openMenuFor: { id, x, y } | null — coords are viewport-fixed.
  const [openMenuFor, setOpenMenuFor] = useState(null);
  // pendingDelete: full conversation object | null. Snapshotted so the
  // Modal still renders the title even if `conversations` updates while
  // the dialog is open (e.g. background refetch).
  const [pendingDelete, setPendingDelete] = useState(null);
  // editingId: id of the conversation currently in inline rename mode, or null.
  const [editingId, setEditingId] = useState(null);

  // Phase 6 / COST-04 — current-month cost stats for the sidebar footer.
  // Fetched on mount + every time `refreshTrigger` bumps (App.jsx bumps it
  // on each SSE `complete` event so the footer reflects the freshest query).
  // `null` means "not loaded yet OR fetch failed" — render branches collapse
  // both into the same empty-microcopy state per PATTERNS.md analog.
  const [costStats, setCostStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stats = await api.getCostStats();
        if (!cancelled) setCostStats(stats);
      } catch (e) {
        console.error('Failed to fetch cost stats:', e);
        if (!cancelled) setCostStats(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  // CONV-03 progressive search state.
  // searchQuery       — controlled input value (every keystroke).
  // debouncedQuery    — searchQuery snapshotted ~200ms after the last keystroke
  //                     (RESEARCH §Pattern 5 sweet spot for 10-100 items).
  // contentSearchActive — true once the user has explicitly opted in to the
  //                     content-fallback (D-10). Sticky for the rest of the session.
  // contentCache      — Map<id, fullConversation> populated lazily on the first
  //                     activation; never invalidated on rename/delete (D-11
  //                     accepts staleness — deleted ids are filtered by
  //                     `conversations` metadata, so they never render anyway).
  // isLoadingContent  — true while Promise.all of api.getConversation() runs.
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [contentSearchActive, setContentSearchActive] = useState(false);
  const [contentCache, setContentCache] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Debounce: copy searchQuery into debouncedQuery 200ms after the last
  // keystroke. Cleanup cancels the pending timer so unmount / rapid typing
  // never fires a stale snapshot.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Title-only filter — cheap, runs on every list/query change.
  const titleMatches = useMemo(() => {
    if (!debouncedQuery) return conversations;
    const q = debouncedQuery.toLowerCase();
    return conversations.filter((c) =>
      (c.title || 'New Conversation').toLowerCase().includes(q)
    );
  }, [conversations, debouncedQuery]);

  // D-10 affordance gate: only surface the content-search opt-in once the
  // title filter has truly given up AND the query is substantive (>= 3 chars,
  // avoids flickering the affordance while the user is mid-typing "ab" → "abo").
  const showContentFallback =
    debouncedQuery.length >= 3 &&
    titleMatches.length === 0 &&
    !contentSearchActive;

  // Final list to render. While content-mode is off, this is just titleMatches.
  // While content-mode is on, search title first (cheap), fall back to scanning
  // user messages + stage3.response + stage1[*].response from the cache.
  const filteredConversations = useMemo(() => {
    if (!contentSearchActive || !contentCache) return titleMatches;
    const q = debouncedQuery.toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if ((c.title || 'New Conversation').toLowerCase().includes(q)) return true;
      const full = contentCache.get(c.id);
      if (!full || !full.messages) return false;
      return full.messages.some((m) => {
        if (m.role === 'user') {
          return (m.content || '').toLowerCase().includes(q);
        }
        // Assistant: stage3.response is the synthesised final answer; stage1
        // is the array of council responses. stage2 is anonymised peer review
        // text — searchable in principle but noisy; keep it out of v1 per D-11.
        const s3 = (m.stage3?.response || '').toLowerCase();
        if (s3.includes(q)) return true;
        return (m.stage1 || []).some((r) =>
          (r.response || '').toLowerCase().includes(q)
        );
      });
    });
  }, [
    contentSearchActive,
    contentCache,
    conversations,
    titleMatches,
    debouncedQuery,
  ]);

  // IA-V2.1-03 — date-bucket grouping over the post-filter list. Reads
  // `Date.now()` once per render; stale `now` only matters at midnight when
  // the user is presumably not actively reading.
  const groupedConversations = useMemo(
    () => groupByDateBucket(filteredConversations, new Date()),
    [filteredConversations]
  );

  // D-11 lazy load: fetch every conversation body in parallel, keep them in a
  // per-session Map. ~10-100 conversations × ~50KB each = ~500KB, viable
  // client-side. Once loaded the flag stays true so subsequent queries reuse
  // the cache for free.
  const activateContentSearch = async () => {
    if (contentSearchActive || isLoadingContent) return;
    setIsLoadingContent(true);
    try {
      const fulls = await Promise.all(
        conversations.map((c) => api.getConversation(c.id))
      );
      const cache = new Map(fulls.map((c) => [c.id, c]));
      setContentCache(cache);
      setContentSearchActive(true);
    } catch (e) {
      console.error('Content search load failed:', e);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const requestDelete = (conv) => {
    setPendingDelete(conv);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    // Close the modal BEFORE awaiting so the user does not see a
    // half-applied state while the network call is in flight.
    setPendingDelete(null);
    await onDeleteConversation(id);
  };

  const cancelDelete = () => setPendingDelete(null);

  // RESEARCH §Pitfall 6 sealed: we deliberately do NOT deselect
  // currentConversationId when it falls out of `filteredConversations`. The
  // central panel keeps showing the active conversation even when the sidebar
  // hides it — Slack/Discord-like behaviour. There is no auto-deselect call
  // anywhere in the search code path.

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
        {/* D-01 lock: sibling button reusing identical class; gap via adjacent-sibling CSS rule below. */}
        <button
          className="new-conversation-btn"
          onClick={onNewCritiqueConversation}
        >
          + New critique
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="search"
          className="search-input"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search conversations"
        />
        {showContentFallback && (
          <button
            type="button"
            className="content-search-affordance"
            onClick={activateContentSearch}
            disabled={isLoadingContent}
          >
            {isLoadingContent
              ? `Loading content from ${conversations.length} conversations...`
              : `Search inside content (${conversations.length} conversations)`}
          </button>
        )}
        {contentSearchActive && (
          <div className="content-search-active-note" aria-live="polite">
            Searching titles + content
          </div>
        )}
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="sidebar__empty">
            <span className="sidebar__empty-mark" aria-hidden="true">&amp;</span>
            <p className="sidebar__empty-body">
              No conversations yet. Start one to see it here.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="no-conversations">
            {debouncedQuery
              ? `No matches for "${debouncedQuery}"`
              : 'No conversations yet'}
          </div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.bucket} className="conversation-group">
              <h2 className="conversation-group-header">{group.bucket}</h2>
              {group.items.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === currentConversationId}
                  isEditing={conv.id === editingId}
                  isMenuOpen={openMenuFor?.id === conv.id}
                  onSelect={() => onSelectConversation(conv.id)}
                  onContextMenu={(e) => {
                    // Per RESEARCH §Pitfall 5: must call preventDefault to
                    // suppress the native browser context menu.
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuFor({ id: conv.id, x: e.clientX, y: e.clientY });
                  }}
                  onMenuTriggerClick={(e) => {
                    // Stop the row's onClick from selecting the conversation
                    // when the user only meant to open its menu.
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setOpenMenuFor({
                      id: conv.id,
                      x: rect.right,
                      y: rect.bottom + 4,
                    });
                  }}
                  onCommitRename={(id, newTitle) => {
                    setEditingId(null);
                    onRenameConversation(id, newTitle);
                  }}
                  onCancelRename={() => setEditingId(null)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Phase 6 / COST-04 — dual-cap sidebar footer.
          Left = OpenRouter cap ($100). Right = Upstream BYOK (no cap).
          Progress bar gates on usageRatio ≥ 0.8 per D-02. */}
      {(() => {
        if (!costStats || (costStats.current_month?.queries ?? 0) === 0) {
          return (
            <div className="sidebar-footer__cost">
              <p className="sidebar-footer__empty">
                No queries this month yet.
              </p>
            </div>
          );
        }
        const totalUsd = costStats.current_month.total_usd ?? 0;
        const upstreamUsd = costStats.current_month.upstream_total_usd ?? 0;
        const queries = costStats.current_month.queries ?? 0;
        const usageRatio = totalUsd / 100;
        const showProgress = usageRatio >= 0.8;
        return (
          <div className="sidebar-footer__cost">
            <div className="sidebar-footer__cols">
              <div className="sidebar-footer__col">
                <span className="sidebar-footer__label">OpenRouter</span>
                <span className="sidebar-footer__value">
                  ${totalUsd.toFixed(2)} / $100
                </span>
                {showProgress && (
                  <div
                    className="sidebar-footer__progress"
                    aria-hidden="true"
                  >
                    <div
                      className="sidebar-footer__progress-fill"
                      style={{ width: `${Math.min(100, usageRatio * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="sidebar-footer__col">
                <span className="sidebar-footer__label">Upstream</span>
                <span className="sidebar-footer__value">
                  ${upstreamUsd.toFixed(2)} BYOK
                </span>
                <span className="sidebar-footer__subtext">no cap</span>
              </div>
            </div>
            <p className="sidebar-footer__microcopy">
              {(usageRatio * 100).toFixed(1)}% of cap · {queries} queries this month
            </p>
          </div>
        );
      })()}

      {openMenuFor && (
        <Menu
          x={openMenuFor.x}
          y={openMenuFor.y}
          onClose={() => setOpenMenuFor(null)}
          items={[
            {
              label: 'Rename',
              shortcut: 'R',
              onClick: () => {
                setEditingId(openMenuFor.id);
              },
            },
            {
              label: 'Delete',
              shortcut: '⌫',
              destructive: true,
              onClick: () => {
                const conv = conversations.find(
                  (c) => c.id === openMenuFor.id
                );
                if (conv) requestDelete(conv);
              },
            },
          ]}
        />
      )}

      <Modal
        isOpen={!!pendingDelete}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete this conversation?"
        body={
          pendingDelete ? (
            <p className="modal-body__meta">
              <em>
                &ldquo;{pendingDelete.title || 'New Conversation'}&rdquo;
              </em>
              {' · '}
              {pendingDelete.message_count ?? 0}{' '}
              {pendingDelete.message_count === 1 ? 'message' : 'messages'}
            </p>
          ) : null
        }
        confirmLabel="Delete conversation"
        cancelLabel="Cancel"
        destructive
      />
    </div>
  );
}
