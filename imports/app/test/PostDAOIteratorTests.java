import dao.PostDAO;
import dao.RandomContentGenerator;
import dao.model.Message;
import dao.model.Post;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

import java.util.Iterator;
import java.util.UUID;

import static junit.framework.TestCase.assertEquals;
import static junit.framework.TestCase.fail;

@RunWith(JUnit4.class)
public class PostDAOIteratorTests {
	@Before
	public void reinitialise() {
		PostDAO.getInstance().clear();
	}

	@Test(timeout=1000)
	public void testSingle() {
		Post post = new Post(UUID.randomUUID());
		PostDAO.getInstance().add(post);

		runTestForMessages(new Message[] {
				new Message(UUID.randomUUID(), null, post.id, 0, "Hi"),
		});
	}

	@Test(timeout=1000)
	public void testMultipleMessages() {
		Post post = new Post(UUID.randomUUID());
		PostDAO.getInstance().add(post);

		runTestForMessages(new Message[] {
				new Message(UUID.randomUUID(), null, post.id, 0, "Hi"),
				new Message(UUID.randomUUID(), null, post.id, 1, "Hi"),
				new Message(UUID.randomUUID(), null, post.id, 2, "Hi"),
				new Message(UUID.randomUUID(), null, post.id, 3, "Hi"),
				new Message(UUID.randomUUID(), null, post.id, 4, "Hi"),
		});
	}

	@Test(timeout=1000)
	public void testMultiplePosts() {
		Post post1 = new Post(UUID.randomUUID());
		Post post2 = new Post(UUID.randomUUID());
		Post post3 = new Post(UUID.randomUUID());
		PostDAO.getInstance().add(post1);
		PostDAO.getInstance().add(post2);
		PostDAO.getInstance().add(post3);

		runTestForMessages(new Message[] {
				new Message(UUID.randomUUID(), null, post1.id, 0, "Hi"),
				new Message(UUID.randomUUID(), null, post2.id, 1, "Hi"),
				new Message(UUID.randomUUID(), null, post2.id, 2, "Hi"),
				new Message(UUID.randomUUID(), null, post3.id, 3, "Hi"),
				new Message(UUID.randomUUID(), null, post3.id, 4, "Hi"),
		});
	}

	@Test(timeout=1000)
	public void testEmptyPosts() {
		Post post1 = new Post(UUID.randomUUID());
		Post post2 = new Post(UUID.randomUUID());
		Post post3 = new Post(UUID.randomUUID());
		Post post4 = new Post(UUID.randomUUID());
		Post post5 = new Post(UUID.randomUUID());
		PostDAO.getInstance().add(post1);
		PostDAO.getInstance().add(post2);
		PostDAO.getInstance().add(post3);
		PostDAO.getInstance().add(post4);
		PostDAO.getInstance().add(post5);

		runTestForMessages(new Message[] {
				new Message(UUID.randomUUID(), null, post2.id, 0, "Hi"),
				new Message(UUID.randomUUID(), null, post2.id, 1, "Hi"),
				new Message(UUID.randomUUID(), null, post4.id, 2, "Hi"),
				new Message(UUID.randomUUID(), null, post4.id, 3, "Hi"),
				new Message(UUID.randomUUID(), null, post4.id, 4, "Hi"),
		});
	}

	@Test(timeout=1000)
	public void testEmpty() {
		runTestForMessages(new Message[] {});
	}

	private void runTestForMessages(Message[] messages) {
		for (Message message : messages) {
			PostDAO.getInstance().get(new Post(message.thread())).messages.insert(message);
		}

		boolean[] found = new boolean[messages.length];
		Iterator<Message> iterator = PostDAO.getInstance().getAllMessages();
		while (iterator.hasNext()) {
			Message currentMessage = iterator.next();

			boolean foundThis = false;
			for (int i = 0; i < messages.length; i++) {
				if (messages[i] == currentMessage) {
					if (found[i]) fail("Same message was returned by iterator multiple times");
					else found[i] = true;
					foundThis = true;
					break;
				}
			}
			if (!foundThis) {
				fail("Returning messages that are not stored in the DAO");
			}
		}

		for (boolean b : found) {
			if (!b) fail("Did not return all messages");
		}
	}

	@Test(timeout=1000)
	public void largeQuantityTest() {
		RandomContentGenerator.populateRandomData();

		int length = 0;
		Iterator<Message> messages = PostDAO.getInstance().getAllMessages();
		while (messages.hasNext()) {
			messages.next();
			length++;
		}
		assertEquals("Check there are exactly 25,000 messages stored", 25_000, length);
	}
}
