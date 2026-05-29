# Post.java

## Path
src/dao/model/Post.java

## Explanation

This file defines the Post class in the dao.model package. A post stores its id, poster, topic, and sorted messages.

## Complexity

Construction is O(1) apart from creating the backing SortedData instance. Message operations depend on the SortedData implementation.

## UML

```mermaid
classDiagram
class Post {
  +id: UUID
  +poster: UUID
  +topic: String
  +messages: SortedData~Message~
  +Post(id: UUID, poster: UUID, topic: String)
  +Post(id: UUID)
  +getUUID() UUID
}
HasUUID <|.. Post
```

## Code
```java
package dao.model;

import dao.MessageComparator;
import sorteddata.SortedData;
import sorteddata.SortedDataFactory;

import java.util.UUID;

public class Post implements HasUUID {
	public final UUID id;
	public final UUID poster;
	public final String topic;
    public final SortedData<Message> messages;

	public Post(UUID id, UUID poster, String topic) {
		this.id = id;
		this.poster = poster;
		this.topic = topic;
		this.messages = SortedDataFactory.makeSortedData(MessageComparator.getInstance());
	}

	public Post(UUID id) {
		this(id, null, null);
	}

	public UUID getUUID() { return id; }
}
```
