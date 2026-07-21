package com.neosis.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileSignatureValidatorTest {

    @Test
    void acceptsMatchingPngSignature() throws Exception {
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", png);

        assertTrue(FileSignatureValidator.matches(file, "image/png"));
    }

    @Test
    void rejectsHtmlRenamedAsImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "photo.png",
            "image/png",
            "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8)
        );

        assertFalse(FileSignatureValidator.matches(file, "image/png"));
    }

    @Test
    void rejectsBinaryPayloadDeclaredAsText() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "notes.txt",
            "text/plain",
            new byte[] {0x41, 0x00, 0x42}
        );

        assertFalse(FileSignatureValidator.matches(file, "text/plain"));
    }
}
