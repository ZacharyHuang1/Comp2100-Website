package hackathon;

import dao.model.Message;
import dao.model.Post;
import dao.model.User;
import java.util.Arrays;
import java.util.UUID;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests DS26: Comment depth-first iterator.
 */
public class DS26_CommentDepthFirstIteratorTest {
    // Verifies that an empty stack has no undo action.
    @Test
    public void emptyStackHasNoUndo() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        assertFalse(stack.undo().isPresent());
    }

    // Verifies that the newest action is undone first.
    @Test
    public void undoReturnsNewestAction() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        stack.push("first");
        stack.push("second");
        assertEquals("second", stack.undo().get());
    }

    // Verifies peek does not remove data.
    @Test
    public void peekKeepsActionOnStack() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        stack.push("edit");
        assertEquals("edit", stack.peek().get());
        assertEquals(1, stack.size());
    }

    // Verifies history order is newest first.
    @Test
    public void historyIsNewestFirst() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        stack.push("old");
        stack.push("new");
        assertEquals(Arrays.asList("new", "old"), stack.history());
    }

    // Verifies clear removes all actions.
    @Test
    public void clearRemovesHistory() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        stack.push("edit");
        stack.clear();
        assertEquals(0, stack.size());
    }
    // Verifies MiniLab model actions can be recorded on the stack.
    @Test
    public void miniLabModelActionsCanBeRecorded() {
        DS26_CommentDepthFirstIterator stack = new DS26_CommentDepthFirstIterator();
        Post post = post("edit");
        stack.pushPostEdit(post, "rename");
        stack.pushMessageEdit(message(post.id, "reply", 5L), "moderate");
        stack.pushUserAction(user("actor"), "login");
        assertEquals(3, stack.size());
        assertTrue(stack.peek().get().startsWith("user:"));
    }

    // Creates a MiniLab Post for integration tests.
    private Post post(String topic) {
        return new Post(UUID.randomUUID(), UUID.randomUUID(), topic);
    }

    // Creates a MiniLab Message for integration tests.
    private Message message(UUID thread, String text, long timestamp) {
        return new Message(UUID.randomUUID(), UUID.randomUUID(), thread, timestamp, text);
    }

    // Creates a MiniLab User for integration tests.
    private User user(String username) {
        return new User(UUID.randomUUID(), User.Role.Member, username, "password");
    }


}
