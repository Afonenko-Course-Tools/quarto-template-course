import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EvidenceContractTest {
    private static String strict(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes)).toString();
    }

    @Test void pairExhibitsInformationLoss() throws CharacterCodingException {
        var answer = Utf8Evidence.evidence();
        assertNotNull(answer);
        assertNotNull(answer.expected());
        for (byte[] bytes : new byte[][] {answer.malformed(), answer.valid()}) {
            assertNotNull(bytes);
            assertTrue(bytes.length >= 1 && bytes.length <= 4096, "Длина от 1 до 4096");
            assertEquals(answer.expected(), new String(bytes, StandardCharsets.UTF_8));
        }
        assertThrows(CharacterCodingException.class, () -> strict(answer.malformed()));
        assertEquals(answer.expected(), strict(answer.valid()));
    }
}
