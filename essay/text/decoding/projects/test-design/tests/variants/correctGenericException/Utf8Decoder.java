import java.nio.ByteBuffer;
import java.nio.charset.*;

public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {
        try {
            return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException failure) {
            throw new CharacterCodingException();
        }
    }
}
