# Media Uploads and Storage

## Upload endpoint

```txt
POST /api/chat/upload
```

Content type:

```txt
multipart/form-data
```

Required fields:

| Field | Description |
|---|---|
| `file` | Uploaded image, video, audio, or document. |
| `recipientEmail` | Email of an accepted contact. |

## Size limits

Application-level limit:

```txt
15 MB
```

Spring multipart configuration:

```yaml
max-file-size: 20MB
max-request-size: 25MB
```

The 15 MB application limit is stricter and should be treated as the real user-facing limit.

## Allowed content types

Allowed by category:

- `image/*`
- `video/*`
- `audio/*`

Allowed documents:

- `application/pdf`
- `text/plain`
- `text/csv`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-powerpoint`
- `application/vnd.openxmlformats-officedocument.presentationml.presentation`

## Metadata stored in GridFS

Each upload stores metadata:

```json
{
  "publicId": "uuid",
  "senderEmail": "sender@example.com",
  "recipientEmail": "recipient@example.com",
  "originalFilename": "safe-name.pdf",
  "contentType": "application/pdf",
  "size": 12345,
  "createdAt": "2026-07-06T12:00:00"
}
```

## Media retrieval

```txt
GET /api/chat/media/{publicId}
```

Access control:

- Current user must equal the file metadata `senderEmail`, or
- Current user must equal the file metadata `recipientEmail`.

## Inline vs attachment behavior

| Content type | Response disposition |
|---|---|
| Image | Inline |
| Video | Inline |
| Audio | Inline |
| Document | Attachment |

## File name safety

The backend sanitizes file names by removing control characters and path separators. Long names are truncated to the last 160 characters.

## Production improvements

For a production-grade messaging system, add:

- Malware scanning before making uploads available.
- Object storage such as S3, Cloudflare R2, or GCS for large-scale media.
- Signed URLs or short-lived access tokens for media delivery.
- Background cleanup for abandoned uploaded files that were never sent in a message.
- Stronger MIME validation using file signatures, not only browser-provided content type.
- Upload quota per user and per conversation.
