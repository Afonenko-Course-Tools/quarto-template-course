import java.nio.*;
import java.nio.charset.*;
import java.util.Arrays;
public final class Utf8Decoder {
    public static String decodeStrict(byte[] bytes) throws CharacterCodingException {

        var decoder = StandardCharsets.UTF_8.newDecoder();
        var output = CharBuffer.allocate(bytes.length);
        var result = decoder.decode(ByteBuffer.wrap(bytes), output, false);
        if (result.isError()) result.throwException();
        output.flip();
        return output.toString();

    }

}
