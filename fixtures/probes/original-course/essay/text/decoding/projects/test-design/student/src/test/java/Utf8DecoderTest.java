import java.nio.charset.CharacterCodingException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class Utf8DecoderTest {
    @Test void acceptsEmptyMessage() throws CharacterCodingException {
        assertEquals("", Utf8Decoder.decodeStrict(new byte[0]));
    }
    // Дополните набор проверками свойств, перечисленных в условии.
}
