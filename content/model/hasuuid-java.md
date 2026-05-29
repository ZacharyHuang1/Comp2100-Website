# HasUUID.java

## Explanation

This file defines the HasUUID interface in the dao.model package. It belongs to src/dao/model in the COMP2100 MiniLab codebase and separates data access responsibilities from application logic. Key methods include getUUID.

## Complexity

DAO operation complexity depends on the backing storage. In-memory lookups may be O(1) with maps or O(n) with lists; file-backed operations may require O(n) scanning or serialization.

## UML

```mermaid
classDiagram
class HasUUID {
  <<interface>>
  ~getUUID() UUID
}
```

## Code
```java
package dao.model;

import java.util.UUID;

/**
 * Simple interface for data classes that hold, and may be referenced by, a unique UUID
 */
public interface HasUUID {
	UUID getUUID();
}

```
