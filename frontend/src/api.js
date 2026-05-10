/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   * @param {'fresh'|'critique'} [mode='fresh'] — conversation mode (Phase 5 D-02).
   *   Default keeps v1 callers green; pass `'critique'` to open in critique mode.
   */
  async createConversation(mode = 'fresh') {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   * @param {string} conversationId
   * @param {string} content
   * @param {'fast'|'quality'|'quality_research'} [profile='fast'] — Quality dial.
   */
  async sendMessage(conversationId, content, profile = 'fast') {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, profile }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {'fast'|'quality'|'quality_research'} profile - Quality dial profile
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, profile, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, profile }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Send a critique (multipart/form-data) and receive streaming updates.
   *
   * Phase 5 critique-mode entry point. Body is a FormData containing
   *   - critique_instruction: the user's freeform instruction (required)
   *   - file_slot_0 / file_slot_1 / file_slot_2: optional research files
   *
   * The SSE reader loop is byte-identical to `sendMessageStream` so the
   * existing App.jsx reducer drains the events with zero modification.
   *
   * IMPORTANT: do NOT set the `Content-Type` header — the browser writes
   * `multipart/form-data; boundary=...` itself; setting it explicitly
   * breaks the multipart parser server-side (RESEARCH §6.3 hard rule).
   *
   * @param {string} conversationId
   * @param {string} critiqueInstruction
   * @param {Array<{file: File, modelId: string} | null>} slots — length-3 array
   * @param {function} onEvent — (eventType, event) => void
   */
  async sendCritiqueStream(conversationId, critiqueInstruction, slots, onEvent) {
    const form = new FormData();
    form.append('critique_instruction', critiqueInstruction);
    slots.forEach((slot, i) => {
      if (slot && slot.file) {
        form.append(`file_slot_${i}`, slot.file, slot.file.name);
      }
    });

    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/critique/stream`,
      { method: 'POST', body: form }
    );

    if (!response.ok) {
      const detail = await response
        .json()
        .catch(() => ({ detail: 'Failed to send critique' }));
      throw new Error(detail.detail || 'Failed to send critique');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Delete a conversation permanently.
   * Backend returns 204 No Content on success.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      { method: 'DELETE' }
    );
    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to delete conversation');
    }
  },

  /**
   * Rename a conversation. Persists across reloads (CONV-02).
   * Backend returns 200 with the updated ConversationMetadata.
   */
  async renameConversation(conversationId, title) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to rename conversation');
    }
    return response.json();
  },
};
