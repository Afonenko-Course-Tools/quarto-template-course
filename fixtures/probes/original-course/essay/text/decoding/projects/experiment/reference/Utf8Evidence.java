import java.nio.charset.StandardCharsets;

public final class Utf8Evidence {
    public record Evidence(byte[] malformed, byte[] valid, String expected) { }

    public static Evidence evidence() {
        String expected = "A\uFFFDZ";
        return new Evidence(new byte[] {0x41, (byte) 0x80, 0x5A},
                expected.getBytes(StandardCharsets.UTF_8), expected);
    }
}
