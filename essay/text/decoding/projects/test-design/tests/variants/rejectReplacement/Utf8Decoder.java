import java.nio.*;
import java.nio.charset.*;
import java.util.Arrays;
public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {

        String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
        if (text.indexOf('\uFFFD') >= 0) throw new CharacterCodingException();
        return text;

    }

}
