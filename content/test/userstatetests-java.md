# UserStateTests.java

## Explanation

This test file defines the UserStateTests class. It belongs to test in the COMP2100 MiniLab codebase and verifies behavior of the user state implementation. It uses JUnit 4 style testing through org.junit imports. Key methods include lifecycleTests.

## Complexity

Test complexity depends on the tested scenario and input size; most unit tests use small fixed-size inputs.

## UML

```mermaid
classDiagram
class UserStateTests {
  <<test>>
  +lifecycleTests() void
}
```

## Code
```java
import dao.UserDAO;
import dao.model.User;
import userstate.GuestState;
import userstate.MemberState;
import userstate.StateManager;
import userstate.UserState;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

import java.util.UUID;

import static junit.framework.TestCase.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

@RunWith(JUnit4.class)
public class UserStateTests {
	/**
	 * Because the user's state is mutable, and expected behaviour is highly dependent on
	 * the current state, it can be difficult to write individual unit tests to analyse the
	 * program's behaviour. Here, the test writer has made just a single, long test.
	 * Can you see why having a long test might be an issue? How could you refactor the test
	 * to fix this issue?
	 */
	@Test(timeout=1000)
	public void lifecycleTests() {
		User member = new User(UUID.randomUUID(), User.Role.Member, "member", "1234");
		User admin  = new User(UUID.randomUUID(), User.Role.Admin,  "admin",  "password");
		UserDAO.getInstance().add(member);
		UserDAO.getInstance().add(admin);

		assertTrue("Program must start in Guest state", StateManager.getState() instanceof GuestState);
		assertFalse("Guest state must not be considered logged-in", StateManager.getState().isLoggedIn());

		boolean success1 = StateManager.login("member", "password");
		assertTrue("Must remain as Guest when credentials are invalid", StateManager.getState() instanceof GuestState);
		assertFalse("Login function must return false when login fails", success1);

		boolean success2 = StateManager.login("member", "1234");
		UserState state2 = StateManager.getState();
		assertTrue("Logging in as member must move to Member state", state2 instanceof MemberState);
		assertTrue("Login function must return true when login succeeds", success2);
		assertEquals("Member state must accurately reflect current user", ((MemberState)state2).user, member);
		assertTrue("Member state must be considered logged in", state2.isLoggedIn());

		boolean success3 = StateManager.login("admin", "password");
		UserState state3 = StateManager.getState();
		assertFalse("Login function must return false when user is already logged in", success3);
		assertEquals("Member state must not change upon subsequent login attempts", state3, state2);
		assertTrue("Member state must be considered logged in", state2.isLoggedIn());

		boolean success4 = StateManager.logout();
		UserState state4 = StateManager.getState();
		assertTrue("Logging out must return to Guest state", state4 instanceof GuestState);
		assertTrue("Logout function must return true upon logout", success4);
		assertFalse("Guest state must not be considered logged-in", StateManager.getState().isLoggedIn());

		boolean success5 = StateManager.logout();
		UserState state5 = StateManager.getState();
		assertTrue("Logging out must remain in guest state if already logged out", state5 instanceof GuestState);
		assertFalse("Logout function must return false when already logged out", success5);
		assertFalse("Guest state must not be considered logged-in", StateManager.getState().isLoggedIn());

		boolean success6 = StateManager.register("3rdAccount", "3rdPASSWORD");
		UserState state6 = StateManager.getState();
		assertTrue("You should be able to register a new account", success6);
		assertTrue("After registration, you should be in the MemberState", state6 instanceof MemberState);
	}
}

```
