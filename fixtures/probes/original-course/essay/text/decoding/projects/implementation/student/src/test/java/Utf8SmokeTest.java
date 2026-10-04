import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class Utf8SmokeTest {
    @Test void readsSimpleMessage() throws CharacterCodingException {
        assertEquals("Java", Utf8Decoder.decodeStrict("Java".getBytes(StandardCharsets.UTF_8)));
    }
    @Test void refusesIsolatedContinuation() {
        assertThrows(CharacterCodingException.class,
                () -> Utf8Decoder.decodeStrict(new byte[] {(byte) 0x80}));
    }
}
