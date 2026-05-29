# PD23_AtomicSaveUsingTempFileTest.java

## Path
test/Mock_hackathon/PersistentData_Mock/PD23_AtomicSaveUsingTempFileTest.java

## Explanation

This test file defines the PD23_AtomicSaveUsingTempFileTest class in the hackathon package. It belongs to test/Mock_hackathon/PersistentData_Mock in the COMP2100 MiniLab codebase and verifies behavior of the pd23 atomic save using temp file implementation. It uses JUnit 4 style testing through org.junit imports. Key methods include saveAndFindRecord, deleteRecordRemovesValue, serializeAndLoadRoundTripsEscapedData, blankKeyIsRejected, csvEscapingHandlesSpecialCharacters.

## Complexity

Test complexity depends on the tested scenario and input size; most unit tests use small fixed-size inputs.

## UML

```mermaid
classDiagram
class PD23_AtomicSaveUsingTempFileTest {
  <<test>>
  +saveAndFindRecord() void
  +deleteRecordRemovesValue() void
  +serializeAndLoadRoundTripsEscapedData() void
  +blankKeyIsRejected() void
  +csvEscapingHandlesSpecialCharacters() void
  +saveToAndLoadFromFile() void
  +miniLabPersistenceAbstractionsAreAvailable() void
}
```

## Code
```java
package hackathon;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests PD23: Atomic save using temp file.
 */
public class PD23_AtomicSaveUsingTempFileTest {
    // Verifies that saved records can be read back.
    @Test
    public void saveAndFindRecord() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        store.saveRecord("post-1", "hello");
        assertEquals("hello", store.findRecord("post-1").get());
    }

    // Verifies that deleting records updates size.
    @Test
    public void deleteRecordRemovesValue() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        store.saveRecord("post-1", "hello");
        assertTrue(store.deleteRecord("post-1"));
        assertEquals(0, store.size());
    }

    // Verifies that serialization round-trips comma and quote data.
    @Test
    public void serializeAndLoadRoundTripsEscapedData() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        store.saveRecord("post-1", "hello, \"MiniLab\"");
        PD23_AtomicSaveUsingTempFile loaded = new PD23_AtomicSaveUsingTempFile();
        loaded.load(store.serialize());
        assertEquals("hello, \"MiniLab\"", loaded.findRecord("post-1").get());
    }

    // Verifies that blank keys are rejected.
    @Test(expected = IllegalArgumentException.class)
    public void blankKeyIsRejected() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        store.saveRecord(" ", "value");
    }

    // Verifies robust CSV escaping for commas quotes and newlines.
    @Test
    public void csvEscapingHandlesSpecialCharacters() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        String row = store.encodeRow(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"));
        assertEquals(Arrays.asList("a,b", "quote \"x\"", "line\nbreak"), store.decodeRow(row));
    }

    // Verifies that file save and load use UTF-8 text.
    @Test
    public void saveToAndLoadFromFile() throws Exception {
        Path path = Files.createTempFile("mock-hackathon", ".csv");
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        store.saveRecord("key", "value");
        store.saveTo(path);
        PD23_AtomicSaveUsingTempFile loaded = new PD23_AtomicSaveUsingTempFile();
        loaded.loadFrom(path);
        assertEquals("value", loaded.findRecord("key").get());
        Files.deleteIfExists(path);
    }
    // Verifies the helper can use original MiniLab persistence abstractions.
    @Test
    public void miniLabPersistenceAbstractionsAreAvailable() {
        PD23_AtomicSaveUsingTempFile store = new PD23_AtomicSaveUsingTempFile();
        assertNotNull(store.miniLabDataManager());
        assertNotNull(store.csvFactory(2));
        assertNotNull(store.recordSerializer());
        assertNotNull(store.pipeline("mock-hackathon-records"));
        String csv = store.writeCsvRows(Collections.singletonList(new String[] { "key", "value" }), 2);
        List<String[]> rows = store.readCsvRows(csv, 2);
        assertArrayEquals(new String[] { "key", "value" }, rows.get(0));
    }


}

```
