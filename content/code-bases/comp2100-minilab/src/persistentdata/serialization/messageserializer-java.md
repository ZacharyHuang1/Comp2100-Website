# MessageSerializer.java

## Path
src/persistentdata/serialization/MessageSerializer.java

## Explanation

This file defines the MessageSerializer class in the persistentdata.serialization package. It converts Message objects to and from a portable String[] representation.

## Complexity

Serialization and deserialization are O(1).

## UML

```mermaid
classDiagram
class MessageSerializer {
  +serialize(object: Message) String[]
  +deserialize(data: String[]) Message
}
Serializer <|.. MessageSerializer
```

## Code
```java
package persistentdata.serialization;

import dao.model.Message;

import java.util.UUID;

/**
 * Converts between Messages and String[] by converting each field of Post
 * (UUID, poster, thread, timestamp, and message) to a string, which becomes one of the entries
 * within the array
 */
public class MessageSerializer implements Serializer<Message, String[]> {

	@Override
	public String[] serialize(Message object) {
		return new String[] {object.id().toString(), object.poster().toString(), object.thread().toString(), String.valueOf(object.timestamp()), object.message()};
	}

	@Override
	public Message deserialize(String[] data) {
		return new Message(UUID.fromString(data[0]), UUID.fromString(data[1]), UUID.fromString(data[2]), Long.valueOf(data[3]), data[4]);
	}
}
```
