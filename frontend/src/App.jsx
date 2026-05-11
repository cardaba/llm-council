import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import ErrorBanner from './components/ErrorBanner';
import SettingsPanel from './components/SettingsPanel';
import SidebarDrawer from './components/SidebarDrawer';
import { useSettings } from './hooks/useSettings';
import { useTouchSwipe } from './hooks/useTouchSwipe';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // H9-01 catastrophic interruption recovery — see ErrorBanner.
  // streamError shape: { stageNumber, originalContent, originalProfile } | null.
  const [streamError, setStreamError] = useState(null);
  const [retryAttempted, setRetryAttempted] = useState(false);
  // Phase 6 / COST-04 — bumped on every `complete` SSE event so the Sidebar
  // footer's cost block refetches /api/stats/cost. Cheapest cross-component
  // trigger: a single integer prop, no context, no event bus.
  const [costStatsRefreshTrigger, setCostStatsRefreshTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Phase 7 / MOBL-02 + MOBL-04 — drawer state shared between the hamburger
  // (tap-to-open) and the useTouchSwipe hook (left-edge swipe-right to open,
  // swipe-left to close). The drawer is mobile-only via the @media guard in
  // SidebarDrawer.css; on desktop these handlers are inert (the dialog has
  // display: none, so showModal()/close() round-trips a no-op visually).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const swipe = useTouchSwipe({
    isOpen: drawerOpen,
    onOpen: () => setDrawerOpen(true),
    onClose: () => setDrawerOpen(false),
  });
  // SET-03 — read the live slider value so the NEXT quality_research request
  // honors the user's choice. Fast / Quality requests ignore this (api.js
  // gates the body extension on `profile === 'quality_research'`).
  const { stage4Threshold } = useSettings();

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
        {
          id: newConv.id,
          created_at: newConv.created_at,
          message_count: 0,
          mode: newConv.mode || 'fresh',
        },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  /**
   * D-01 / D-02 — second sidebar button creates a critique conversation.
   * The new entry is prepended to the sidebar list with `mode: 'critique'`
   * so the Critique pill renders immediately (no extra fetch round-trip).
   * Submit handler is wired in Task 2 (`handleSubmitCritique`).
   */
  const handleNewCritiqueConversation = async () => {
    try {
      const newConv = await api.createConversation('critique');
      setConversations([
        {
          id: newConv.id,
          created_at: newConv.created_at,
          message_count: 0,
          mode: 'critique',
        },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create critique conversation:', error);
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

  /**
   * Single SSE-event dispatcher shared between fresh-prompt (handleSendMessage)
   * and critique (handleSubmitCritique) flows. Plan-checker W-2 lock: the
   * switch lives here, not duplicated per caller, so future SSE shape changes
   * (PERS-01/02 metadata extensions, etc.) only touch one site.
   *
   * Callers pass `errorContext` so the 'error' branch can populate
   * setStreamError with the right retry payload. Critique callers pass null
   * (no retry support yet — Phase 6+ may extend).
   *
   * Stale-event guard (06-08, closes 06-UAT BLOCKER from Test 2):
   * Every setter that writes to `lastMsg.loading.*` or to in-flight assistant
   * slots starts with `if (!lastMsg?.loading) return prev;`. Persisted assistant
   * messages (hydrated via api.getConversation) NEVER carry a `loading` key —
   * it's UI-ephemeral state. In-flight assistant placeholders created in
   * handleSendMessage / handleSubmitCritique ALWAYS carry it. So when the user
   * switches conversations mid-stream, late SSE events targeting the previous
   * conversation hit a `prev.messages` belonging to the NEW conversation; the
   * guard short-circuits before we crash on `lastMsg.loading.stage1 = false`.
   * Race is pre-existing (not a Phase 6 regression).
   *
   * Deferred v2.1+ hardening (better fixes, more blast radius):
   *   Option 2 — AbortController in handleSelectConversation: kills the original
   *     stream on switch. UX trade-off: original deliberation lost on tab change.
   *   Option 3 — backend SSE payload includes conversation_id, frontend filters
   *     events whose id !== currentConversationId. Most robust; requires backend
   *     SSE shape change in backend/main.py.
   * Re-open as a v2.1 plan when multi-tab / multi-stream UX matters.
   */
  const handleStreamEvent = useCallback((eventType, event, errorContext) => {
    switch (eventType) {
      case 'stage1_start':
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
          lastMsg.loading.stage1 = true;
          return { ...prev, messages };
        });
        break;

      case 'stage1_complete':
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
          lastMsg.stage1 = event.data;
          lastMsg.loading.stage1 = false;
          return { ...prev, messages };
        });
        break;

      case 'stage2_start':
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
          lastMsg.loading.stage2 = true;
          return { ...prev, messages };
        });
        break;

      case 'stage2_complete':
        // Critique n=1 case (per Plan 05-02 SSE contract): event.data === []
        // and event.metadata is empty — the reducer still drains the step
        // identically, the Stage2 component just renders nothing useful.
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
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
          if (!lastMsg?.loading) return prev;
          lastMsg.loading.stage3 = true;
          return { ...prev, messages };
        });
        break;

      case 'stage3_complete':
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
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
          if (!lastMsg?.loading) return prev;
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
          if (!lastMsg?.loading) return prev;
          lastMsg.critic = event.data;
          return { ...prev, messages };
        });
        break;

      case 'stage4_start':
        // QR pipeline only — fires when critic score < threshold (8).
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
          lastMsg.loading = { ...(lastMsg.loading || {}), stage4: true };
          return { ...prev, messages };
        });
        break;

      case 'stage4_complete':
        // QR pipeline only — refined chairman synthesis with reasoning.
        setCurrentConversation((prev) => {
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg?.loading) return prev;
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
        // Stream complete, reload conversations list + nudge the sidebar
        // footer cost block to refetch (Phase 6 / COST-04).
        loadConversations();
        setCostStatsRefreshTrigger((n) => n + 1);
        setIsLoading(false);
        break;

      case 'error': {
        console.error('Stream error:', event.message);
        // Determine which stage was active when the error fired so the
        // banner can name it ("Stage 1" / "Stage 2" / "Stage 3"). We
        // walk forward through the stage slots: whichever was most
        // recently populated tells us which one was running next.
        let stageNumber = 1;
        setCurrentConversation((prev) => {
          const lastMsg = prev?.messages?.[prev.messages.length - 1];
          if (lastMsg?.stage1) stageNumber = 2;
          if (lastMsg?.stage2) stageNumber = 3;
          if (lastMsg?.stage3) stageNumber = 4;  // QR refinement step
          return prev;
        });
        if (errorContext) {
          setStreamError({
            stageNumber,
            originalContent: errorContext.originalContent,
            originalProfile: errorContext.originalProfile,
          });
        } else {
          // Critique flow — no retry payload yet; banner still shows but
          // Retry will be a no-op until Phase 6+ extends it.
          setStreamError({ stageNumber, originalContent: null, originalProfile: null });
        }
        setIsLoading(false);
        break;
      }

      default:
        console.log('Unknown event type:', eventType);
    }
  }, []);

  const handleSendMessage = async (content, profile = 'fast', explicitStage4Threshold) => {
    if (!currentConversationId) return;
    // SET-03 — ChatInterface always passes the live useSettings value as the
    // 3rd arg; retry (handleRetryError) calls with 2 args, so we fall back
    // to the closure-captured stage4Threshold when undefined. api.js gates
    // the body extension on profile === 'quality_research' so passing the
    // value for fast / quality is harmless.
    const effectiveThreshold =
      explicitStage4Threshold !== undefined ? explicitStage4Threshold : stage4Threshold;

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

      // Send message with streaming — dispatch through the shared reducer.
      // SET-03 — forward the live useSettings stage4Threshold; api.js gates
      // the body extension on `profile === 'quality_research'` so fast /
      // quality requests omit the field automatically.
      const errorContext = { originalContent: content, originalProfile: profile };
      await api.sendMessageStream(
        currentConversationId,
        content,
        profile,
        (eventType, event) => handleStreamEvent(eventType, event, errorContext),
        effectiveThreshold
      );
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

  /**
   * Critique submit handler — dispatches multipart POST to the Wave-1
   * backend endpoint and drains the SSE stream through the shared
   * handleStreamEvent reducer (W-2 lock: no inline-copy of the switch).
   *
   * The optimistic message shape mirrors handleSendMessage's exactly, plus an
   * `external_research` dict keyed by modelId so future hydration (Plan 05-04)
   * can re-render the file chips on reload.
   */
  const handleSubmitCritique = async (instruction, slots) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Optimistic user message — uses the instruction as the body.
      const userMessage = { role: 'user', content: instruction };

      // Build external_research keyed by slot.modelId so the same shape
      // round-trips with the backend persistence (Plan 05-01 + 05-02).
      const externalResearch = slots.reduce((acc, s) => {
        if (s) {
          acc[s.modelId] = {
            filename: s.name,
            content: s.content,
            size_bytes: s.size,
          };
        }
        return acc;
      }, {});

      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        stage4: null,
        metadata: null,
        critic: null,
        external_research: externalResearch,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
          stage4: false,
        },
      };

      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
      }));

      await api.sendCritiqueStream(
        currentConversationId,
        instruction,
        slots,
        (eventType, event) => handleStreamEvent(eventType, event, null)
      );
    } catch (error) {
      console.error('Critique stream failed:', error);
      // Remove optimistic messages on error (mirror handleSendMessage)
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  // ErrorBanner handlers. Retry re-enters handleSendMessage with the captured
  // (originalContent, originalProfile) tuple. Dismiss is conditional on a
  // prior retry attempt (UI-SPEC §Copywriting Contract line 256).
  const handleRetryError = useCallback(() => {
    if (!streamError) return;
    setRetryAttempted(true);
    const { originalContent, originalProfile } = streamError;
    setStreamError(null);
    handleSendMessage(originalContent, originalProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamError]);

  const handleDismissError = useCallback(() => {
    setStreamError(null);
    setRetryAttempted(false);
  }, []);

  return (
    // Touch handlers attach to the shell root (NOT to <main>) so left-edge
    // swipe-right is caught regardless of which inner element the gesture
    // lands on. The .messages-container `touch-action: pan-y` rule from
    // 07-01 still lets vertical scrolls bypass the swipe path entirely.
    <div className="app" {...swipe}>
      <Header
        onSettingsOpen={() => setSettingsOpen(true)}
        onMenuOpen={() => setDrawerOpen(true)}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {/* Mobile-only drawer. The desktop <Sidebar> below stays mounted; the
       * @media (min-width: 769px) rules in SidebarDrawer.css + Sidebar.css
       * decide which one is visible at any given breakpoint. The drawer
       * embeds its OWN <Sidebar> instance with the same props as desktop,
       * plus tap-to-dismiss wrappers around the navigation callbacks. */}
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={(id) => {
            handleSelectConversation(id);
            setDrawerOpen(false);
          }}
          onNewConversation={() => {
            handleNewConversation();
            setDrawerOpen(false);
          }}
          onNewCritiqueConversation={() => {
            handleNewCritiqueConversation();
            setDrawerOpen(false);
          }}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          refreshTrigger={costStatsRefreshTrigger}
        />
      </SidebarDrawer>
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onNewCritiqueConversation={handleNewCritiqueConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        refreshTrigger={costStatsRefreshTrigger}
      />
      {/* inert is a React 19 prop. Passing '' enables the attribute; passing
       * undefined removes it. This makes the main panel non-focusable and
       * non-interactive while the drawer is open (browser-native focus trap
       * in conjunction with the <dialog> showModal() inside SidebarDrawer). */}
      <div
        className="app__main-with-banner"
        inert={drawerOpen ? '' : undefined}
      >
        {streamError && (
          <ErrorBanner
            stageNumber={streamError.stageNumber}
            onRetry={handleRetryError}
            onDismiss={handleDismissError}
            retryAttempted={retryAttempted}
          />
        )}
        <ChatInterface
          conversation={currentConversation}
          onSendMessage={handleSendMessage}
          onSubmitCritique={handleSubmitCritique}
          isLoading={isLoading}
          stage4Threshold={stage4Threshold}
        />
      </div>
    </div>
  );
}

export default App;
