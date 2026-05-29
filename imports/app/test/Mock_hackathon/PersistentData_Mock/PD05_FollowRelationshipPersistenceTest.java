package hackathon;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests PD05: Follow relationship persistence.
 */
public class PD05_FollowRelationshipPersistenceTest {
    // Verifies that saved records can be read back.
    @Test
    public void saveAndFindRecord() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        store.saveRecord("post-1", "hello");
        assertEquals("hello", store.findRecord("post-1").get());
    }

    // Verifies that deleting records updates size.
    @Test
    public void deleteRecordRemovesValue() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        store.saveRecord("post-1", "hello");
        assertTrue(store.deleteRecord("post-1"));
        assertEquals(0, store.size());
    }

    // Verifies that serialization round-trips comma and quote data.
    @Test
    public void serializeAndLoadRoundTripsEscapedData() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        store.saveRecord("post-1", "hello, \"MiniLab\"");
        PD05_FollowRelationshipPersistence loaded = new PD05_FollowRelationshipPersistence();
        loaded.load(store.serialize());
        assertEquals("hello, \"MiniLab\"", loaded.findRecord("post-1").get());
    }

    // Verifies that blank keys are rejected.
    @Test(expected = IllegalArgumentException.class)
    public void blankKeyIsRejected() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        store.saveRecord(" ", "value");
    }

    // Verifies robust CSV escaping for commas quotes and newlines.
    @Test
    public void csvEscapingHandlesSpecialCharacters() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        String row = store.encodeRow(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"));
        assertEquals(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"), store.decodeRow(row));
    }

    // Verifies that file save and load use UTF-8 text.
    @Test
    public void saveToAndLoadFromFile() throws Exception {
        Path path = Files.createTempFile("mock-hackathon", ".csv");
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        store.saveRecord("key", "value");
        store.saveTo(path);
        PD05_FollowRelationshipPersistence loaded = new PD05_FollowRelationshipPersistence();
        loaded.loadFrom(path);
        assertEquals("value", loaded.findRecord("key").get());
        Files.deleteIfExists(path);
    }
    // Verifies the helper can use original MiniLab persistence abstractions.
    @Test
    public void miniLabPersistenceAbstractionsAreAvailable() {
        PD05_FollowRelationshipPersistence store = new PD05_FollowRelationshipPersistence();
        assertNotNull(store.miniLabDataManager());
        assertNotNull(store.csvFactory(2));
        assertNotNull(store.recordSerializer());
        assertNotNull(store.pipeline("mock-hackathon-records"));
        String csv = store.writeCsvRows(Collections.singletonList(new String[] { "key", "value" }), 2);
        List<String[]> rows = store.readCsvRows(csv, 2);
        assertArrayEquals(new String[] { "key", "value" }, rows.get(0));
    }


}
