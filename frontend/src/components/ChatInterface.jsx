import { useState, useEffect, useRef } from 'react';
import Markdown from './Markdown';
import MessageHeader from './MessageHeader';
import QualityToggle from './QualityToggle';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import {
  ATTACHMENT_LIMITS,
  buildDeliberationFilename,
  buildFullDeliberationMarkdown,
  buildPromptWithAttachments,
  readFileAsText,
  triggerDownload,
} from '../utils/download';
import './ChatInterface.css';

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

// Find the user prompt that precedes the assistant message at the given index.
function findQuestionFor(messages, assistantIndex) {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return null;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
}) {
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState('fast');
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const totalAttachedBytes = attachments.reduce((acc, a) => acc + a.size, 0);

  const handleFilesSelected = async (e) => {
    setAttachError(null);
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const next = [...attachments];
    let runningTotal = totalAttachedBytes;

    for (const file of picked) {
      if (file.size > ATTACHMENT_LIMITS.perFile) {
        setAttachError(
          `"${file.name}" exceeds per-file limit (${formatBytes(file.size)} > ${formatBytes(ATTACHMENT_LIMITS.perFile)})`
        );
        continue;
      }
      if (runningTotal + file.size > ATTACHMENT_LIMITS.total) {
        setAttachError(
          `Total attachment size would exceed ${formatBytes(ATTACHMENT_LIMITS.total)}`
        );
        break;
      }
      try {
        const content = await readFileAsText(file);
        next.push({ name: file.name, size: file.size, content });
        runningTotal += file.size;
      } catch (err) {
        setAttachError(`Failed to read "${file.name}": ${err.message}`);
      }
    }

    setAttachments(next);
    // Reset the input so picking the same file again still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
    setAttachError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const fullPrompt = buildPromptWithAttachments(input, attachments);
      onSendMessage(fullPrompt, profile);
      setInput('');
      setAttachments([]);
      setAttachError(null);
      // NOTE: profile is intentionally NOT reset — single-shot conversation
      // hides the input form after send anyway, but if reused the user's last
      // choice persists.
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDownloadConversation = (msg, msgIndex) => {
    const question = findQuestionFor(conversation.messages, msgIndex);
    const md = buildFullDeliberationMarkdown({
      question,
      stage1: msg.stage1,
      stage2: msg.stage2,
      stage3: msg.stage3,
      stage4: msg.stage4,
      metadata: msg.metadata,
      messageMetadata: msg.metadata,
      critic: msg.critic,
    });
    triggerDownload(buildDeliberationFilename(question), md);
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to LLM Council</h2>
          <p>Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Ask a question to consult the LLM Council</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="assistant-header">
                    <div className="message-label">LLM Council</div>
                    {msg.stage3 && (
                      <button
                        type="button"
                        className="download-btn"
                        onClick={() => handleDownloadConversation(msg, index)}
                        title="Download full deliberation as markdown"
                      >
                        Download conversation
                      </button>
                    )}
                  </div>

                  <MessageHeader metadata={msg.metadata} />

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 1: Collecting individual responses...</span>
                    </div>
                  )}
                  {msg.stage1 && <Stage1 responses={msg.stage1} />}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 2: Peer rankings...</span>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 3: Final synthesis...</span>
                    </div>
                  )}
                  {/* Stage 4 spinner — fires after stage3_complete in QR pipeline
                      when the critic gated below threshold. */}
                  {msg.loading?.stage4 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 4: Refining synthesis...</span>
                    </div>
                  )}
                  {msg.stage3 && (
                    <Stage3
                      finalResponse={msg.stage3}
                      question={findQuestionFor(conversation.messages, index)}
                      stage4={msg.stage4}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversation.messages.length === 0 && (
        <form className="input-form" onSubmit={handleSubmit}>
          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((att, idx) => (
                <span key={idx} className="attachment-chip">
                  <span className="attachment-name">{att.name}</span>
                  <span className="attachment-size">{formatBytes(att.size)}</span>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => removeAttachment(idx)}
                    aria-label={`Remove ${att.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <span className="attachment-total">
                Total: {formatBytes(totalAttachedBytes)} / {formatBytes(ATTACHMENT_LIMITS.total)}
              </span>
            </div>
          )}
          {attachError && <div className="attachment-error">{attachError}</div>}
          <QualityToggle value={profile} onChange={setProfile} disabled={isLoading} />
          <div className="input-row">
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept=".md,.txt,.csv,.tsv,.py,.sql,.json,.yml,.yaml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.sh,.ps1,.ini,.toml,.log,.conf,.ipynb"
              multiple
              onChange={handleFilesSelected}
              disabled={isLoading}
            />
            <textarea
              className="message-input"
              placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
