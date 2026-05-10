import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id) => {
    // Per RESEARCH §Pitfall 7 + §Empty-state restoration (D-12):
    // If the deleted conversation is the currently selected one, drop
    // local state to null BEFORE awaiting the network call so that
    // ChatInterface immediately shows the welcome state and does not
    // attempt to load a conversation that no longer exists.
    const wasSelected = id === currentConversationId;
    if (wasSelected) {
      setCurrentConversationId(null);
      setCurrentConversation(null);
    }
    try {
      await api.deleteConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      // Intentionally not restoring selection — the user explicitly
      // requested deletion; the next loadConversations() will reflect
      // whatever the server actually has.
    }
    await loadConversations();
  };

  const handleRenameConversation = async (id, newTitle) => {
    // Per RESEARCH §Anti-Patterns: NO need to call loadConversation(id) even
    // when renaming the active conversation — the chat pane content does not
    // depend on the title; only the sidebar list does, and loadConversations
    // updates that.
    try {
      await api.renameConversation(id, newTitle);
      await loadConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const handleSendMessage = async (content, profile = 'fast') => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively.
      // Phase 3 Plan 03-05 extends the shape with `critic` and `stage4` slots
      // (filled by the new SSE events critic_complete + stage4_complete) plus
      // a stage4 spinner flag in `loading`.
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        stage4: null,
        metadata: null,
        critic: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
          stage4: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, profile, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              lastMsg.loading.stage2 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              return { ...prev, messages };
            });
            break;

          case 'message_metadata':
            // Merge profile/models/chairman shape (D-25) into the assistant
            // message metadata that Stage 2 already populated with
            // {label_to_model, aggregate_rankings}. Order matters — we want
            // the new event to extend, not replace, the prior shape.
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.metadata = {
                ...(lastMsg.metadata || {}),
                ...event.data,
              };
              return { ...prev, messages };
            });
            break;

          case 'critic_complete':
            // QR pipeline only. event.data shape: {score, concern}
            // (see backend/research_strategy.py).
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.critic = event.data;
              return { ...prev, messages };
            });
            break;

          case 'stage4_start':
            // QR pipeline only — fires when critic score < threshold (8).
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading = { ...(lastMsg.loading || {}), stage4: true };
              return { ...prev, messages };
            });
            break;

          case 'stage4_complete':
            // QR pipeline only — refined chairman synthesis with reasoning.
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage4 = event.data;
              lastMsg.loading = { ...(lastMsg.loading || {}), stage4: false };
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
