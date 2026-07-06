# WebSocket and Realtime

## Endpoint

Frontend connects to:

```txt
${BACKEND_URL}/ws
```

The backend registers `/ws` as a SockJS STOMP endpoint.

## Broker prefixes

| Prefix | Direction | Purpose |
|---|---|---|
| `/app` | Client to backend controller | Application messages handled by `@MessageMapping`. |
| `/user` | Backend to specific user | User-specific queues. |
| `/topic` | Broadcast broker prefix | Enabled but not heavily used in current code. |
| `/queue` | Queue broker prefix | User-specific delivery. |

## Client subscriptions

The frontend subscribes to:

```txt
/user/queue/messages
/user/queue/typing
/user/queue/signaling
/user/queue/notifications
```

## Client publish destinations

### Send chat message

```txt
/app/chat.send
```

Payload example:

```json
{
  "recipientEmail": "friend@example.com",
  "content": "Hello",
  "timestamp": "12:30 PM",
  "messageType": "TEXT",
  "localId": "client-temp-id"
}
```

Backend behavior:

- Uses authenticated principal as real sender.
- Validates recipient exists.
- Validates accepted contact relationship.
- Trims content.
- Rejects blank text messages.
- Rejects messages longer than 5,000 characters.
- Saves to MongoDB.
- Sends saved message to both sender and recipient queues.

### Typing indicator

```txt
/app/chat.typing
```

Payload:

```json
{
  "recipientEmail": "friend@example.com",
  "isTyping": "true"
}
```

Backend behavior:

- Uses authenticated principal as sender.
- Validates accepted contact relationship.
- Sends sanitized typing payload to recipient.

### WebRTC signaling

```txt
/app/chat.signal
```

Supported `type` values:

- `offer`
- `answer`
- `ice-candidate`
- `end-call`
- `call-rejected`

Payload example:

```json
{
  "type": "offer",
  "recipientEmail": "friend@example.com",
  "sdp": "..."
}
```

Backend behavior:

- Uses authenticated principal as sender.
- Validates accepted contact relationship.
- Allows only known signaling types.
- Forwards payload to recipient's `/user/queue/signaling`.

## Message size limits

Configured in `WebSocketConfig`:

```java
registration.setMessageSizeLimit(128 * 1024);
registration.setSendBufferSizeLimit(512 * 1024);
registration.setSendTimeLimit(20_000);
```

## Scaling limitation

The current broker is the Spring simple broker. It does not coordinate across multiple backend instances. For production scaling:

- Use STOMP broker relay with RabbitMQ or ActiveMQ.
- Externalize HTTP sessions or enforce sticky sessions.
- Ensure WebSocket traffic is routed consistently by the load balancer.
