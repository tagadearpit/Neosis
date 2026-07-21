package com.neosis.security;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;

public final class FileSignatureValidator {

    private static final int INSPECTION_BYTES = 8 * 1024;
    private static final Set<String> ZIP_DOCUMENT_TYPES = Set.of(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    private static final Set<String> OLE_DOCUMENT_TYPES = Set.of(
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint"
    );

    private FileSignatureValidator() {}

    public static boolean matches(MultipartFile file, String contentType) throws IOException {
        byte[] bytes;
        try (InputStream input = file.getInputStream()) {
            bytes = input.readNBytes(INSPECTION_BYTES);
        }
        if (bytes.length == 0) return false;

        return switch (contentType) {
            case "image/jpeg" -> startsWith(bytes, 0xff, 0xd8, 0xff);
            case "image/png" -> startsWith(bytes, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
            case "image/gif" -> startsWithAscii(bytes, "GIF87a") || startsWithAscii(bytes, "GIF89a");
            case "image/webp" -> startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, "WEBP");
            case "video/mp4", "video/quicktime", "audio/mp4" -> asciiAt(bytes, 4, "ftyp");
            case "video/webm", "audio/webm" -> startsWith(bytes, 0x1a, 0x45, 0xdf, 0xa3);
            case "audio/ogg" -> startsWithAscii(bytes, "OggS");
            case "audio/wav", "audio/x-wav" -> startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, "WAVE");
            case "audio/mpeg" -> startsWithAscii(bytes, "ID3")
                || (bytes.length >= 2 && unsigned(bytes[0]) == 0xff && (unsigned(bytes[1]) & 0xe0) == 0xe0);
            case "application/pdf" -> startsWithAscii(bytes, "%PDF-");
            case "text/plain", "text/csv" -> looksLikeText(bytes);
            default -> ZIP_DOCUMENT_TYPES.contains(contentType)
                ? startsWith(bytes, 0x50, 0x4b, 0x03, 0x04)
                : OLE_DOCUMENT_TYPES.contains(contentType)
                    && startsWith(bytes, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
        };
    }

    private static boolean looksLikeText(byte[] bytes) {
        for (byte value : bytes) {
            int current = unsigned(value);
            if (current == 0) return false;
            if (current < 0x20 && current != '\n' && current != '\r' && current != '\t' && current != '\f') {
                return false;
            }
        }
        return true;
    }

    private static boolean startsWithAscii(byte[] bytes, String signature) {
        return asciiAt(bytes, 0, signature);
    }

    private static boolean asciiAt(byte[] bytes, int offset, String signature) {
        byte[] expected = signature.getBytes(StandardCharsets.US_ASCII);
        return bytes.length >= offset + expected.length
            && Arrays.equals(bytes, offset, offset + expected.length, expected, 0, expected.length);
    }

    private static boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) return false;
        for (int index = 0; index < signature.length; index++) {
            if (unsigned(bytes[index]) != signature[index]) return false;
        }
        return true;
    }

    private static int unsigned(byte value) {
        return value & 0xff;
    }
}
