# SortedDataSubject.java

## Path
src/sorteddata/SortedDataSubject.java

## Explanation

This file defines the SortedDataSubject interface in the sorteddata package. It belongs to src/sorteddata in the COMP2100 MiniLab codebase and defines a contract that other classes implement. Key methods include onAdd.

## Complexity

Not specified.

## UML

```mermaid
classDiagram
class SortedDataSubject {
  <<interface>>
  ~onAdd(element: T) void
}
```

## Code
```java
package sorteddata;

public interface SortedDataSubject<T> {
	void onAdd(T element);
}

```
