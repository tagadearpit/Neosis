# Database Schema

Database: MongoDB.

The application uses Spring Data MongoDB repositories and Mongo auditing.

## `users` collection

Model: `User`

| Field | Type | Notes |
|---|---|---|
| `id` | string | MongoDB document ID. |
| `email` | string | Unique indexed, normalized lowercase. |
| `name` | string | Name from Google profile. |
| `termsAccepted` | boolean | Whether terms were accepted. |
| `termsAcceptedAt` | datetime | Terms acceptance timestamp. |
| `createdAt` | datetime | First creation timestamp. |
| `lastLoginAt` | datetime | Most recent successful Google OAuth login. |
| `lastSeenAt` | datetime | Last bounded presence heartbeat. |

Index:

- `email` unique.

## `chat_requests` collection

Model: `ChatRequest`

| Field | Type | Notes |
|---|---|---|
| `id` | string | MongoDB document ID. |
| `senderEmail` | string | Normalized lowercase. |
| `receiverEmail` | string | Normalized lowercase. |
| `status` | string | `PENDING` or `ACCEPTED`. |
| `pairKey` | string | Sorted email pair, format `a@example.com#b@example.com`. |
| `createdAt` | datetime | Request creation timestamp. |
| `updatedAt` | datetime | Last status update timestamp. |

Indexes:

- Unique compound index on `pairKey`.
- Index on `pairKey`.

Purpose of `pairKey`:

- Prevent duplicate contact requests for the same pair.
- Make sender/receiver order irrelevant.

## `messages` collection

Model: `ChatMessage`

| Field | Type | Notes |
|---|---|---|
| `id` | string | MongoDB document ID. |
| `senderEmail` | string | Set server-side from authenticated principal. |
| `recipientEmail` | string | Normalized lowercase. |
| `content` | string | Text content or caption. Max 5,000 characters in controller. |
| `timestamp` | string | Client-provided display timestamp. |
| `messageType` | string | `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, or `DOCUMENT`. |
| `mediaData` | string | Media URL for non-text messages. |
| `mediaFilename` | string | Original safe file name. |
| `mediaContentType` | string | Sanitized content type. |
| `mediaSize` | number | File length in bytes. |
| `createdAt` | datetime | Server-side creation timestamp. |
| `readAt` | datetime | Server-side read timestamp. |
| `expiresAt` | datetime | Optional disappearing-text-message expiry and TTL key. |
| `localId` | string | Transient client identifier, not persisted. |

Indexes:

```java
@CompoundIndex(
  name = "conversation_created_idx",
  def = "{ 'senderEmail': 1, 'recipientEmail': 1, 'createdAt': -1 }"
)
```

Note: The history query uses `$or` for both sender/recipient directions. For very large message collections, consider an explicit `conversationId` field to improve query/index efficiency.

## Settings and safety collections

| Collection | Model | Purpose |
|---|---|---|
| `user_settings` | `UserSettings` | Versioned privacy, notification, appearance, media and security groups. |
| `conversation_preferences` | `ConversationPreference` | Per-user pin, mute, clear and disappearing-message choices. |
| `blocked_users` | `BlockedUser` | Unique blocker/blocked pairs used by server authorization checks. |
| `login_events` | `LoginEvent` | Masked login history with 180-day TTL retention. |
| `abuse_reports` | `AbuseReport` | Structured report category, status and optional message evidence metadata. |

Important indexes:

- Unique `user_settings.ownerEmail`.
- Unique compound `blocked_users(blockerEmail, blockedEmail)`.
- `login_events(ownerEmail, createdAt desc)` plus TTL on `expiresAt`.
- `messages.expiresAt` TTL for disappearing messages.

## GridFS collections

MongoDB GridFS stores uploaded files in:

```txt
fs.files
fs.chunks
```

Relevant metadata is attached to files in `fs.files.metadata`.

## Recommended schema improvements

- Add `conversationId` to messages and media metadata.
- Add delivery/read receipts if the product needs them.
- Add message edit/delete state if required.
- Add indexes for user search and pending request retrieval.
- Add TTL cleanup for unused media uploads.
- Extend login auditing to additional security-sensitive events.
