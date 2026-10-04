import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.Arrays;

public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {
        try {
            return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException failure) {
            Arrays.fill(bytes, (byte) 0);
            throw failure;
        }
    }
}
