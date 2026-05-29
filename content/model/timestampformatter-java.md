# TimestampFormatter.java

## Explanation

This file defines the TimestampFormatter interface in the dao.model package. It belongs to src/dao/model in the COMP2100 MiniLab codebase and separates data access responsibilities from application logic. Key methods include format.

## Complexity

DAO operation complexity depends on the backing storage. In-memory lookups may be O(1) with maps or O(n) with lists; file-backed operations may require O(n) scanning or serialization.

## UML

```mermaid
classDiagram
class TimestampFormatter {
  <<interface>>
  ~format(timestamp: long) String
}
```

## Code
```java
package dao.model;

public interface TimestampFormatter {
	String format(long timestamp);
}

```
