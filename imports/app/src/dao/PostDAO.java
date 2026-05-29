package dao;

import dao.model.HasUUID;
import dao.model.Message;
import dao.model.Post;

import java.util.Comparator;
import java.util.Iterator;
import java.util.ArrayList;
import java.util.List;

public class PostDAO extends DAO<Post> {
	/**
	 * Generates a PostDAO by automatically building a Comparator that
	 * checks just that the UUID fields match. If you don't understand
	 * this syntax, don't worry. It's an advanced Java technique.
	 */
	private PostDAO() {
		super(Comparator.comparing(HasUUID::getUUID));
	}
	private static PostDAO instance;

	/**
	 * Gets a singleton instance of PostDAO, creating one if necessary.
	 * @return the instance
	 */
	public static PostDAO getInstance() {
		if (instance == null) instance = new PostDAO();
		return instance;
	}

	/**
	 * Gets the ith post, in order of timestamp
	 * @param i the index of the post to search for
	 * @return the post
	 */
	public Post getAtIndex(int i) {
		return data.getAtIndex(i);
	}

	/**
	 * Returns an Iterator that iterates through every message given as a reply to
	 * every post stored within the DAO, in no particular order.
	 * @return the iterator
	 */
	public Iterator<Message> getAllMessages() {
		Iterator<Message> result = null;
		// TODO: Complete this method using the Iterator design pattern
		List<Message> allMessages = new ArrayList<>();
		Iterator<Post> posts = getAll();

		while (posts.hasNext()) {
			Post post = posts.next();
			Iterator<Message> messages = post.messages.getAll();
			while (messages.hasNext()) {
				allMessages.add(messages.next());
			}
		}

		result = allMessages.iterator();
		return result;
	}
}
