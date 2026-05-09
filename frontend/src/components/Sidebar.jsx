import { useState, useEffect, useRef } from 'react';
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
            </div>
            <div className="conversation-meta">
              {conv.message_count} messages
            </div>
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

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}) {
  // openMenuFor: { id, x, y } | null — coords are viewport-fixed.
  const [openMenuFor, setOpenMenuFor] = useState(null);
  // pendingDelete: full conversation object | null. Snapshotted so the
  // Modal still renders the title even if `conversations` updates while
  // the dialog is open (e.g. background refetch).
  const [pendingDelete, setPendingDelete] = useState(null);
  // editingId: id of the conversation currently in inline rename mode, or null.
  const [editingId, setEditingId] = useState(null);

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

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
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
          ))
        )}
      </div>

      {openMenuFor && (
        <Menu
          x={openMenuFor.x}
          y={openMenuFor.y}
          onClose={() => setOpenMenuFor(null)}
          items={[
            {
              label: 'Rename',
              onClick: () => {
                setEditingId(openMenuFor.id);
              },
            },
            {
              label: 'Delete',
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
        title="Delete conversation"
        body={
          pendingDelete ? (
            <>
              <p>
                Delete &quot;{pendingDelete.title || 'New Conversation'}&quot;?
              </p>
              <p>This cannot be undone.</p>
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
      />
    </div>
  );
}
