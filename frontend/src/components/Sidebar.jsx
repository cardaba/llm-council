import { useState } from 'react';
import Menu from './Menu';
import Modal from './Modal';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  // openMenuFor: { id, x, y } | null — coords are viewport-fixed.
  const [openMenuFor, setOpenMenuFor] = useState(null);
  // pendingDelete: full conversation object | null. Snapshotted so the
  // Modal still renders the title even if `conversations` updates while
  // the dialog is open (e.g. background refetch).
  const [pendingDelete, setPendingDelete] = useState(null);

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
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
              onContextMenu={(e) => {
                // Per RESEARCH §Pitfall 5: must call preventDefault to
                // suppress the native browser context menu.
                e.preventDefault();
                e.stopPropagation();
                setOpenMenuFor({ id: conv.id, x: e.clientX, y: e.clientY });
              }}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              <button
                type="button"
                className="menu-trigger"
                aria-label={`Actions for ${conv.title || 'conversation'}`}
                aria-haspopup="menu"
                aria-expanded={openMenuFor?.id === conv.id}
                onClick={(e) => {
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
              >
                ⋮
              </button>
            </div>
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
