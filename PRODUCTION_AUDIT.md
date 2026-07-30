# Neosis Production Audit

## Implemented in this revision

### Authentication and sessions

- Replaced transient OAuth authorization-request cookies with the standard session-backed flow.
- Added MongoDB-backed Spring Session storage with a 30-day configurable cookie.
- Prevented subsequent Google logins from overwriting a user-customized display name.
- Added explicit API `401` behavior, session fixation protection, server-side logout, and health endpoint access.

### Account lifecycle

- Added profile name and status editing with server-side validation.
- Added persisted notification-sound and typing-indicator preferences.
- Added destructive account deletion requiring the literal confirmation `DELETE`.
- Account deletion removes the user’s messages, GridFS media, contact relationships, conversation preferences, and active session.

### Conversation controls

- Added per-user persistent pin and mute state.
- Added server-backed clear-for-me semantics using a conversation cutoff timestamp.
- Added remove-contact behavior.
- Added unread counts, read receipts, request rejection, contact details, and profile status display.

### Messaging and media

- Centralized CSRF acquisition/retry and API error handling in the frontend client.
- Removed manual multipart `Content-Type` headers so the browser supplies a valid boundary.
- Added strict message/media type allowlists, upload size enforcement, safe filenames, and authenticated media authorization.
- Added bounded message content, bounded history retrieval, and safer optimistic-message reconciliation.
- Corrected the UI and PWA metadata so text chat is not falsely described as end-to-end encrypted.

### Realtime and calls

- Added HTTP and STOMP per-session rate limiting.
- Added WebSocket message-size/send-buffer limits and heartbeat/reconnect handling.
- Sanitized signaling payloads before relaying them.
- Added audio-call playback, connection cleanup, busy/decline handling, permission errors, and configurable TURN settings.

### Operations

- Added graceful shutdown, response compression, health probes, container health checks, non-root runtime users, environment templates, and Docker Compose.
- Frontend assets use immutable caching while the SPA shell and service worker use safe cache policies.
- Added model-level unit tests and a frontend production-build check.

## Residual risks before public-scale launch

### No message E2EE

Messages and media are readable by the backend and database operators. Implementing E2EE requires client key identity, authenticated key exchange, device management, forward secrecy, encrypted attachments, key recovery decisions, and an independent security review. A UI label or symmetric encryption with a server-held key is not E2EE.

### Horizontal scaling

The Spring simple broker and both rate limiters are process-local. More than one backend instance can produce inconsistent subscriptions and independently enforced limits. Replace the simple broker with a broker relay and use Redis or an API gateway for distributed limits.

### File scanning

MIME allowlisting reduces browser-executable upload risk but does not detect malware or active content inside office documents. Add content-signature inspection, antivirus scanning, quarantine, and object-storage lifecycle policies.

### Deletion atomicity

Account erasure is synchronous and idempotent but not transactional on a standalone MongoDB deployment. A process failure can leave partial records. For regulated erasure, use a replica-set transaction or a durable deletion workflow with retries and an audit trail.

### Message history pagination

History is bounded to the latest 100 messages and has no cursor-based infinite pagination. Add a stable `(createdAt, id)` cursor before large conversations are expected.

### WebRTC reliability and abuse controls

A production TURN server is required. Add call ringing timeouts, TURN credential rotation, call permission controls, abuse reporting, and quality telemetry.

### Observability

Health endpoints and structured server logging exist, but there is no centralized tracing, metrics dashboard, alert policy, error aggregation, or security audit log. Add these before an SLA-backed release.

### Data retention and compliance

Define retention periods, backup/restore testing, privacy policy, terms, incident response, export/access requests, and region-specific legal requirements before collecting real user data.

## Release gate

Do not describe this repository as fully production-certified. It is production-hardened relative to the original codebase, but public launch still requires deployment-specific secrets management, HTTPS, TURN, monitoring, backup validation, dependency scanning, penetration testing, and resolution or explicit acceptance of the residual risks above.

---

## Grounded Feature Roadmap & Prioritized Development Order

Based on an architectural audit of the active Neosis codebase (where `ChatMessage.java` currently lacks `replyTo`, `reactions`, `edited`, and `deleted` fields, and there is currently no `Group` / `Room` backend schema), this section outlines the complete feature wishlist and prioritizes execution into grounded tiers.

### Tier 1 — Finish What Is Already Stubbed in the UI
These features currently have UI placeholders in [`SettingsModal.jsx`](file:///d:/CandyRobot/Neosis-main/neosis-frontend/src/components/SettingsModal.jsx) that are disabled ("not enabled in this release") waiting for backend completion:
1. **Profile Photo Upload**: 
   - *Current State*: The Privacy tab in `SettingsModal.jsx` has a disabled photo selector.
   - *Required Work*: Add `profilePhotoUrl` to `User.java`, implement an authenticated `/api/chat/upload/avatar` endpoint with strict image validation, and replace the initials-based avatar `<divs>` with `<img>` tags across `NeosisChat.jsx` and modals.
2. **Group Chats**:
   - *Current State*: Group conversations are disabled across UI toggles ("who can add me to groups").
   - *Required Work*: Create a `Group` / `Room` MongoDB schema, membership tracking, add `conversationId` to `ChatMessage.java` (as flagged in `Database-Schema.md`), implement group-aware STOMP WebSocket routing, and add group admin controls (add/remove member, leave group).

### Tier 2 — High-Value Core Messaging Features (Moderate Backend Work)
3. **Message Reactions (⭐ Highest Priority)**:
   - *Scope*: Double-click to ❤️, emoji picker popover, multiple reactions per message, floating Framer Motion animations, and live updates via WebSocket.
   - *Backend*: Add `reactions: Map<String, List<String>>` to `ChatMessage.java` and broadcast via WebSocket signaling.
4. **Reply to Messages (⭐ Highest Priority)**:
   - *Scope*: Swipe/click to reply, quoted message preview above the bubble, and click-to-scroll-to-original.
   - *Backend*: Add `replyToMessageId` to `ChatMessage.java`.
5. **Message Editing & Deleting**:
   - *Scope*: Edit within 15 minutes with an "Edited" label, and "Delete for everyone" with an animated disappearance.
   - *Backend*: Add `edited: boolean`, `deletedAt: Instant` to `ChatMessage.java` and live WS broadcast reconciliation.
6. **Forward Messages**:
   - *Scope*: Multi-select contact picker sheet to forward text, images, videos, and documents.
7. **Link Previews (Open Graph Unfurling)**:
   - *Scope*: Replace raw hostname previews in `firstSafeLink` with a cached backend OG unfurler (title, description, image) with strict SSRF protections.
8. **Pin Messages**:
   - *Scope*: Conversation pinned-message section with jump-to-pinned navigation.

### Tier 3 — Infrastructure-Level Features
9. **True Push Notifications**:
   - *Scope*: Expand browser-only `Notification` API to closed-tab/phone-locked delivery using Web Push subscriptions stored per device and a backend push sender service.
10. **Global Search Across Conversations**:
   - *Scope*: Search across all chats for text, images, files, links, and dates with keyword highlighting. Backed by a MongoDB text index on `ChatMessage.content`.
11. **Offline Send Queue & Auto-Retry**:
   - *Scope*: Queue outgoing messages in IndexedDB when WebSocket is disconnected and auto-retry on reconnect instead of dropping messages.
12. **Screen Sharing in WebRTC Calls**:
   - *Scope*: Use `navigator.mediaDevices.getDisplayMedia()` to attach screen tracks to existing WebRTC peer connections.

### Tier 4 — Nice-to-Haves & Advanced Polish
13. **Chat Wallpapers & Per-Conversation Theming**.
14. **Contact Folders & Custom Labels**.
15. **Scheduled / Send-Later Messages**.
16. **Voice Message Transcription**: Automatic speech-to-text on voice notes.
17. **Abuse Report Moderation Dashboard**: Administrative interface to review submitted `AbuseReport` records.

### Comprehensive Feature Catalog by Category

#### 🔥 Phase 1 (Highest Priority)
- **Message Reactions**: Double-click to ❤️, emoji picker, scale/pop/ripple Framer Motion effects, live WS updates.
- **Reply to Messages**: Swipe-to-reply, quote preview, scroll to original message.
- **Message Editing**: 15-minute edit window, "Edited" label, optional edit history.
- **Delete for Everyone**: Delete for me vs. delete for everyone with smooth collapse animation.
- **Forward Messages**: Multi-select chats for images, videos, documents, and text.
- **Pin Messages**: Pinned banner with jump-to-message functionality.
- **Search Inside Conversation**: Search images, files, links, dates, and text with word highlighting.
- **Unsend / Upload Controls**: Cancel, pause, and retry active file uploads.

#### 🚀 Phase 2
- **Typing Improvements**: Display `"Arpit is typing..."` with animated bounce dots instead of generic text.
- **Voice Waveform**: Visual audio waveform player like WhatsApp instead of a static `🎤 0:25` timer.
- **Read Receipts Animation**: Smooth Framer Motion transitions from single tick → double tick → blue tick.
- **Online Presence**: Granular states (`online`, `typing`, `last seen`, `idle`, `away`).
- **Smart Unread Badge**: Animated unread separator with jump-to-first-unread button.

#### 📸 Media Experience
- **Instagram-Style Media Viewer**: Fullscreen lightbox with zoom, swipe navigation, download, share, and blur background.
- **Image Compression**: Client-side progressive image compression before upload.
- **Drag & Drop Upload**: Desktop drag-and-drop zone with animated drop target and pre-send preview.
- **Gallery View**: Chat Info section categorized into Photos, Videos, Files, and Links.

#### 🎨 UI & Framer Motion Polish
- **Glassmorphism**: Consistent backdrop-blur styling across sidebar, search, settings, popups, attachments, and emoji picker.
- **Animated Sidebar & Chat Switching**: Smooth slide, blur, scale, and fade transitions when toggling views or conversations.
- **Better Chat Bubble**: Subtle gradient accents, glow effects, and rounded corner smoothing.
- **Floating New Message Button**: Appears dynamically while scrolling up through history.
- **Skeleton Loaders & Empty States**: Shimmer skeletons for conversation list/messages/profile and animated empty state illustrations.
- **Framer Motion Highlights**: Shared layout expansion on chat open, Telegram-style hero avatar transition into chat header, ripple click effects, fan-out attachment menu, and context-menu scale/blur animation.

#### 🤖 AI Features (Differentiating Capabilities)
- **AI Chat Summary**: Summarize long conversations or missed messages.
- **AI Smart Reply**: Quick contextual response suggestions (*"Yes"*, *"Thanks"*, *"I'll call you later"*).
- **AI Translate**: On-demand or automatic message translation.
- **AI Grammar Fix & Rewrite**: Right-click to improve tone (*Friendly*, *Professional*, *Formal*, *Short*, *Funny*).
- **AI Meeting Notes**: Action items and summary extraction for group chats.
- **AI Image Description**: Accessibility and search tags for uploaded media.

#### 👥 Group Features
- Admin roles, polls, events, `@username` mentions, threaded replies, group announcements, shared media gallery, invite links, join requests, slow mode, and pinned announcements.

#### 🔒 Security
- End-to-end encryption (long-term initiative requiring client key identity, exchange, and recovery), device management, login history, active sessions, 2FA, app lock with PIN/biometrics, and suspicious login detection.

#### ⚡ Performance & Premium Polish
- Virtualized message lists for large chats, infinite scrolling, image lazy loading, optimistic UI reconciliation, background synchronization, IndexedDB caching, magnetic hover effects, custom animated desktop cursor, confetti animations for milestones, and keyboard shortcuts (`Ctrl+K` search, `Ctrl+/` shortcuts).

---

### Recommended Development Order
1. ⭐ **Reply to Messages**
2. ⭐ **Message Reactions**
3. ⭐ **Edit & Delete Messages**
4. ⭐ **Search Within Chats**
5. ⭐ **Media Gallery & Improved Viewer**
6. ⭐ **Mentions & Group Enhancements**
7. ⭐ **AI Summaries & Smart Replies**
8. ⭐ **End-to-End Encryption / 2FA**
9. ⭐ **Performance Optimizations (Virtualization, Caching)**
10. ⭐ **Advanced Polish & Custom Theming**

