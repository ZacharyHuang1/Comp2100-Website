package hackathon;

import dao.model.Message;
import dao.model.Post;
import dao.model.User;
import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests DS03: Hashtag index.
 */
public class DS03_HashtagIndexTest {
    // Verifies that an empty index returns no ids.
    @Test
    public void emptyIndexReturnsNoResults() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        assertTrue(index.search("missing").isEmpty());
        assertEquals(0, index.itemCount());
    }

    // Verifies that lookup is case-insensitive and punctuation-safe.
    @Test
    public void searchNormalizesCaseAndPunctuation() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        UUID id = UUID.randomUUID();
        index.add(id, "Hello, MiniLab!");
        assertEquals(Collections.singleton(id), index.search("hello"));
        assertEquals(Collections.singleton(id), index.search("MINILAB"));
    }

    // Verifies that repeated words do not duplicate ids.
    @Test
    public void duplicateWordsDoNotDuplicateResults() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        UUID id = UUID.randomUUID();
        index.add(id, "dao dao dao");
        assertEquals(1, index.search("dao").size());
    }

    // Verifies that intersection search keeps only common matches.
    @Test
    public void searchAllReturnsIntersection() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        index.add(first, "post dao test");
        index.add(second, "post graph");
        assertEquals(Collections.singleton(first), index.searchAll(Arrays.asList("post", "dao")));
    }

    // Verifies that removing an item updates every token bucket.
    @Test
    public void removeDeletesAllTokenReferences() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        UUID id = UUID.randomUUID();
        index.add(id, "alpha beta");
        assertTrue(index.remove(id));
        assertTrue(index.search("alpha").isEmpty());
        assertFalse(index.remove(id));
    }
    // Verifies MiniLab Post Message and User overloads update the index.
    @Test
    public void miniLabModelOverloadsUpdateIndex() {
        DS03_HashtagIndex index = new DS03_HashtagIndex();
        Post post = post("DAO hashtag search");
        Message message = message(post.id, "reply content", 10L);
        User user = user("miniuser");
        index.addPost(post);
        index.addMessage(message);
        index.addUser(user);
        assertTrue(index.search("dao").contains(post.id));
        assertTrue(index.search("reply").contains(message.id()));
        assertTrue(index.search("miniuser").contains(user.id()));
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
