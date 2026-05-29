# DP25_LegacyCSVAdapterTest.java

## Explanation

This test file defines the DP25_LegacyCSVAdapterTest class in the hackathon package. It belongs to test/Mock_hackathon/DesignPatterns in the COMP2100 MiniLab codebase and verifies behavior of the dp25 legacy csv adapter implementation. It uses JUnit 4 style testing through org.junit imports. Key methods include saveStoresValue, ruleCanDenyAction, listenerReceivesEvents, deleteRemovesStoredValue, undoRestoresPreviousState.

## Complexity

Test complexity depends on the tested scenario and input size; most unit tests use small fixed-size inputs.

## UML

```mermaid
classDiagram
class DP25_LegacyCSVAdapterTest {
  <<test>>
  +saveStoresValue() void
  +ruleCanDenyAction() void
  +listenerReceivesEvents() void
  +deleteRemovesStoredValue() void
  +undoRestoresPreviousState() void
  +blankKeyIsRejected() void
  +miniLabModelAndStateAdaptersWork() void
}
```

## Code
```java
package hackathon;

import dao.model.User;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.Test;
import userstate.GuestState;
import static org.junit.Assert.*;

/**
 * Tests DP25: Legacy CSV adapter.
 */
public class DP25_LegacyCSVAdapterTest {
    // Verifies that saving stores values by key.
    @Test
    public void saveStoresValue() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        assertTrue(service.save("member", "post-1", "hello"));
        assertEquals("hello", service.find("post-1").get());
    }

    // Verifies that strategy rules can deny work.
    @Test
    public void ruleCanDenyAction() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        service.setRule((role, action) -> false);
        assertFalse(service.save("guest", "post-1", "hello"));
        assertFalse(service.find("post-1").isPresent());
    }

    // Verifies that listeners observe service events.
    @Test
    public void listenerReceivesEvents() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        List<String> events = new ArrayList<>();
        service.addListener(events::add);
        service.save("member", "post-1", "hello");
        assertEquals(Collections.singletonList("saved:post-1"), events);
    }

    // Verifies that delete respects existing data.
    @Test
    public void deleteRemovesStoredValue() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        service.save("member", "post-1", "hello");
        assertTrue(service.delete("admin", "post-1"));
        assertEquals(0, service.size());
    }

    // Verifies that undo restores the previous state.
    @Test
    public void undoRestoresPreviousState() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        service.save("member", "post-1", "hello");
        assertTrue(service.undoLast());
        assertFalse(service.find("post-1").isPresent());
    }

    // Verifies that blank keys are rejected.
    @Test(expected = IllegalArgumentException.class)
    public void blankKeyIsRejected() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        service.save("member", " ", "value");
    }
    // Verifies the service integrates with MiniLab model and state abstractions.
    @Test
    public void miniLabModelAndStateAdaptersWork() {
        DP25_LegacyCSVAdapter service = new DP25_LegacyCSVAdapter();
        User user = new User(UUID.randomUUID(), User.Role.Member, "patternuser", "password");
        assertTrue(service.saveUser(user));
        assertEquals("patternuser", service.find(user.id().toString()).get());
        assertFalse(service.isStateLoggedIn(new GuestState()));
        assertNotNull(service.sortedKeys());
        assertNotNull(service.dataManager());
        assertEquals("clean", service.censorWith(text -> "clean", "raw"));
    }


}

```
