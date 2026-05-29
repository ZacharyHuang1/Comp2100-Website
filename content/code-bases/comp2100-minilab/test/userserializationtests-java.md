# UserSerializationTests.java

## Path
test/UserSerializationTests.java

## Explanation

This test file defines the UserSerializationTests class. It belongs to test in the COMP2100 MiniLab codebase and verifies behavior of the user serialization implementation. It uses JUnit 4 style testing through org.junit imports. Key methods include parameters, testInvariance.

## Complexity

Test complexity depends on the tested scenario and input size; most unit tests use small fixed-size inputs.

## UML

```mermaid
classDiagram
class UserSerializationTests {
  <<test>>
  +user: User
  +parameters() Collection<Object[]>
  +testInvariance() void
}
```

## Code
```java
import dao.model.User;
import org.junit.runners.Parameterized;
import persistentdata.serialization.UserSerializer;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.Collection;
import java.util.UUID;

import static junit.framework.TestCase.assertEquals;

/**
 * Since we don't specify an exact schema by which you should serialize a User,
 * the only property we can reasonably ask for is that when you deserialize and
 * then re-serialize a user, you recover a user with identical fields to the first.
 * This is exactly what this class does, using parameterised testing to run a number
 * of such tests.
 */
@RunWith(Parameterized.class)
public class UserSerializationTests {
	@Parameterized.Parameter
	public User user;

	@Parameterized.Parameters
	public static Collection<Object[]> parameters() {
		return Arrays.asList(
				new Object[][] {
						{new User(UUID.randomUUID(), User.Role.Member, "Zane", "bestTutor")},
						{new User(UUID.randomUUID(), User.Role.Member, "Cathy", "special,\"characters\",abound")},
						{new User(UUID.randomUUID(), User.Role.Member, "Mary", "t3stPa55w0rd")},
						{new User(UUID.randomUUID(), User.Role.Admin, "Bernardo", "ilovesoftwaredev")},
						{new User(UUID.randomUUID(), User.Role.Admin, "Dylan", "password123")},
				});
	}

	@Test(timeout = 100)
	public void testInvariance() {
		User result = new UserSerializer().deserialize(new UserSerializer().serialize(user));
		assertEquals("Did not recover same ID when deserializing", user.id(), result.id());
		assertEquals("Did not recover same role when deserializing", user.role(), result.role());
		assertEquals("Did not recover same username when deserializing", user.username(), result.username());
		assertEquals("Did not recover same password when deserializing", user.password(), result.password());
	}
}
```
