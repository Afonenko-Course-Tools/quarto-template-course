import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;

/** Намеренно дефектная реализация для локального испытания тестов. */
public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
