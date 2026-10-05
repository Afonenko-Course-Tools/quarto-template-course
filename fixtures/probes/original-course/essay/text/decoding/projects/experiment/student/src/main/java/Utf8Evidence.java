public final class Utf8Evidence {
    public record Evidence(byte[] malformed, byte[] valid, String expected) { }

    public static Evidence evidence() {
        throw new UnsupportedOperationException("Предъявите пару сообщений и общий результат");
    }
}
