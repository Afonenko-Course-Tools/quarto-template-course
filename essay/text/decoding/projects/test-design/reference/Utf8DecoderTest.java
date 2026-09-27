import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class Utf8DecoderTest {
    @Test void acceptsEmptyMessage() throws CharacterCodingException {
        assertEquals("", Utf8Decoder.decodeStrict(new byte[0]));
    }
    @Test void preservesValidMultibyteTextAndLiteralReplacement() throws CharacterCodingException {
        String expected = "Я€😀\uFFFD";
        byte[] input = expected.getBytes(StandardCharsets.UTF_8);
        byte[] before = input.clone();
        assertEquals(expected, Utf8Decoder.decodeStrict(input));
        assertArrayEquals(before, input);
    }
    @Test void refusesDamageWithinMessageWithoutMutation() {
        byte[] input = {0x41, (byte) 0x80, 0x5A};
        byte[] before = input.clone();
        assertThrows(CharacterCodingException.class, () -> Utf8Decoder.decodeStrict(input));
        assertArrayEquals(before, input);
    }
    @Test void refusesUnfinishedFinalCharacter() {
        byte[] input = {0x41, (byte) 0xE2, (byte) 0x82};
        byte[] before = input.clone();
        assertThrows(CharacterCodingException.class, () -> Utf8Decoder.decodeStrict(input));
        assertArrayEquals(before, input);
    }
}
