# PostSerializer.java

## Path
src/persistentdata/serialization/PostSerializer.java

## Explanation

This file defines the PostSerializer class in the persistentdata.serialization package. It belongs to src/persistentdata/serialization in the COMP2100 MiniLab codebase and converts domain objects to and from persistent representations. Key methods include serialize, deserialize.

## Complexity

Not specified.

## UML

```mermaid
classDiagram
class PostSerializer {
  +serialize(object: Post) String[]
  +deserialize(data: String[]) Post
}
Serializer <|.. PostSerializer
String <|.. PostSerializer
```

## Code
```java
package persistentdata.serialization;

import dao.model.Post;
import persistentdata.DataPipeline.Serializer;

import java.util.UUID;

/**
 * Stores posts as UUID, poster UUID, and topic fields.
 */
public class PostSerializer implements Serializer<Post, String[]> {

	@Override
	public String[] serialize(Post object) {
		return new String[] {
				object.id.toString(),
				object.poster.toString(),
				object.topic
		};
	}

	@Override
	public Post deserialize(String[] data) {
		return new Post(UUID.fromString(data[0]), UUID.fromString(data[1]), data[2]);
	}
}

```
