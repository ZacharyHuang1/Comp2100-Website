import dao.RandomContentGenerator;
import dao.UserDAO;
import dao.model.User;
import junit.framework.TestCase;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

import static junit.framework.TestCase.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

@RunWith(JUnit4.class)
public class UserDAODaoTests {
	@Test(timeout=1000)
	public void registerAndLoginTests() {
		User register1 = UserDAO.getInstance().register("userA", "password");
		User register2 = UserDAO.getInstance().register("userB", "password");
		User register3 = UserDAO.getInstance().register("userC", "password");

		User user1 = UserDAO.getInstance().login("userA", "password");
		assertEquals("Must obtain the inserted user on successful login", "userA", user1.username());
		assertEquals("Must obtain the inserted user on successful login", "password", user1.password());
		assertEquals("Must obtain the inserted user on successful login", register1, user1);

		User user2 = UserDAO.getInstance().login("userB", "password");
		assertEquals("Must obtain the inserted user on successful login", "userB", user2.username());
		assertEquals("Must obtain the inserted user on successful login", "password", user2.password());
		assertEquals("Must obtain the inserted user on successful login", register2, user2);

		User user3 = UserDAO.getInstance().login("userC", "wrong password");
		TestCase.assertNull("Must obtain null on unsuccessful login", user3);
	}

	@Test(timeout=1000)
	public void stressTest() {
		RandomContentGenerator.populateRandomData();

		UserDAO.getInstance().register("specialAdmin", "comp2100isCOOL");

		RandomContentGenerator.populateRandomData();

		User user1 = UserDAO.getInstance().login("specialAdmin", "comp2100isCOOL");
		assertNotNull(user1);

		User user2 = UserDAO.getInstance().login("secondAdmin", "bernardoRulez");
		assertNull(user2);
	}

	@Test(timeout=1000)
	public void invalidRegistrationTest() {
		UserDAO.getInstance().register("aaaa", "password");
		UserDAO.getInstance().register("bbbb", "password");
		UserDAO.getInstance().register("cccc", "password");

		User test = UserDAO.getInstance().register("bbbb", "different");
		TestCase.assertNull("Registrations with a duplicate username should fail", test);

		User test2 = UserDAO.getInstance().register("W_IE. RD!", "password");
		TestCase.assertNull("Non-alphanumeric usernames must be rejected", test2);

		User test3 = UserDAO.getInstance().register("x", "password");
		TestCase.assertNull("Usernames that are too short must be rejected", test3);

		User test4 = UserDAO.getInstance().register("abcdefghijklmnopqrstuvwxyz", "password");
		TestCase.assertNull("Usernames that are too long must be rejected", test4);

		User test5 = UserDAO.getInstance().register("finalTest", "");
		TestCase.assertNull("Ensure passwords adhere to the expected rules", test5);
	}
}
