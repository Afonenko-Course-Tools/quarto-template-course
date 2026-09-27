import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EvidenceSmokeTest {
    @Test void providesThreeValues() {
        var answer = Utf8Evidence.evidence();
        assertNotNull(answer);
        assertNotNull(answer.malformed());
        assertNotNull(answer.valid());
        assertNotNull(answer.expected());
    }
}
