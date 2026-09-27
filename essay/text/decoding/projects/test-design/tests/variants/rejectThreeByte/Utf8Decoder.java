import java.nio.ByteBuffer;
import java.nio.charset.*;

public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {
        String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
        boolean rejected = text.codePoints().anyMatch(cp -> new String(Character.toChars(cp))
                .getBytes(StandardCharsets.UTF_8).length == 3);
        if (rejected) throw new CharacterCodingException();
        return text;
    }
}
