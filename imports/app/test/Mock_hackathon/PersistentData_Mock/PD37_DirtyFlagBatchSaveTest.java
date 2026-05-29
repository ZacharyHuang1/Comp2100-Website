package hackathon;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests PD37: Dirty-flag batch save.
 */
public class PD37_DirtyFlagBatchSaveTest {
    // Verifies that saved records can be read back.
    @Test
    public void saveAndFindRecord() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        store.saveRecord("post-1", "hello");
        assertEquals("hello", store.findRecord("post-1").get());
    }

    // Verifies that deleting records updates size.
    @Test
    public void deleteRecordRemovesValue() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        store.saveRecord("post-1", "hello");
        assertTrue(store.deleteRecord("post-1"));
        assertEquals(0, store.size());
    }

    // Verifies that serialization round-trips comma and quote data.
    @Test
    public void serializeAndLoadRoundTripsEscapedData() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        store.saveRecord("post-1", "hello, \"MiniLab\"");
        PD37_DirtyFlagBatchSave loaded = new PD37_DirtyFlagBatchSave();
        loaded.load(store.serialize());
        assertEquals("hello, \"MiniLab\"", loaded.findRecord("post-1").get());
    }

    // Verifies that blank keys are rejected.
    @Test(expected = IllegalArgumentException.class)
    public void blankKeyIsRejected() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        store.saveRecord(" ", "value");
    }

    // Verifies robust CSV escaping for commas quotes and newlines.
    @Test
    public void csvEscapingHandlesSpecialCharacters() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        String row = store.encodeRow(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"));
        assertEquals(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"), store.decodeRow(row));
    }

    // Verifies that file save and load use UTF-8 text.
    @Test
    public void saveToAndLoadFromFile() throws Exception {
        Path path = Files.createTempFile("mock-hackathon", ".csv");
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        store.saveRecord("key", "value");
        store.saveTo(path);
        PD37_DirtyFlagBatchSave loaded = new PD37_DirtyFlagBatchSave();
        loaded.loadFrom(path);
        assertEquals("value", loaded.findRecord("key").get());
        Files.deleteIfExists(path);
    }
    // Verifies the helper can use original MiniLab persistence abstractions.
    @Test
    public void miniLabPersistenceAbstractionsAreAvailable() {
        PD37_DirtyFlagBatchSave store = new PD37_DirtyFlagBatchSave();
        assertNotNull(store.miniLabDataManager());
        assertNotNull(store.csvFactory(2));
        assertNotNull(store.recordSerializer());
        assertNotNull(store.pipeline("mock-hackathon-records"));
        String csv = store.writeCsvRows(Collections.singletonList(new String[] { "key", "value" }), 2);
        List<String[]> rows = store.readCsvRows(csv, 2);
        assertArrayEquals(new String[] { "key", "value" }, rows.get(0));
    }


}
