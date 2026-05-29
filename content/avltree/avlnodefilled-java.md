# AVLNodeFilled.java

## Explanation

This file defines the AVLNodeFilled class in the sorteddata.avltree package. It belongs to src/sorteddata/avltree in the COMP2100 MiniLab codebase and implements AVL tree behavior for balanced sorted data operations. Key methods include height, balanceFactor, size, toString, insert.

## Complexity

Typical AVL tree operations such as search, insertion, and deletion are O(log n), assuming the tree remains height-balanced.

## UML

```mermaid
classDiagram
class AVLNodeFilled {
  ~right: AVLNode<T> left,
  ~value: T
  -size: int height, balance,
  ~newLeft: AVLNode<T>
  ~newRight: AVLNode<T>
  ~movedSubtree: AVLNode<T>
  ~movedSubtree: AVLNode<T>
  +AVLNodeFilled(comparator: Comparator<T>, value: T, left: AVLNode<T>, right: AVLNode<T>)
  +height() int
  +balanceFactor() int
  +size() int
  +toString() String
  +insert(element: T) AVLNodeFilled<T>
  -leftRotate() AVLNodeFilled<T>
  -rightRotate() AVLNodeFilled<T>
  +getAtIndex(i: int) T
  +contains(element: T) boolean
}
```

## Code
```java
package sorteddata.avltree;

import java.util.Comparator;

class AVLNodeFilled<T> extends AVLNode<T> {
	final AVLNode<T> left, right;
	final T value;
	private final int height, balance, size;
	public AVLNodeFilled(Comparator<T> comparator, T value, AVLNode<T> left, AVLNode<T> right) {
		super(comparator);
		this.value = value;
		this.left = left;
		this.right = right;
		this.size = left.size() + right.size() + 1;
		this.height = Math.max(left.height(), right.height())+1;

		// TODO: Overwrite the following line to correctly compute the tree's balance factor
		this.balance = left.height() - right.height();
	}

	public int height() {
		return height;
	}
	public int balanceFactor() {
		return balance;
	}
	public int size() {
		return size;
	}

	public String toString() {
		if (left instanceof AVLNodeEmpty<T> && right instanceof AVLNodeEmpty<T>)
			return value.toString();
		else
			return "%s -> (%s, %s)".formatted(value.toString(), left.toString(), right.toString());
	}

	public AVLNodeFilled<T> insert(T element) {
		// TODO: Complete this method
		int cmp = comparator.compare(element, value);
		AVLNode<T> newLeft = left;
		AVLNode<T> newRight = right;

		if (cmp < 0) {
			newLeft = left.insert(element);
		} else {
			newRight = right.insert(element);
		}

		AVLNodeFilled<T> newNode = new AVLNodeFilled<>(comparator, value, newLeft, newRight);
		int balance = newNode.balanceFactor();

		// LL
		if (balance > 1 && comparator.compare(element, ((AVLNodeFilled<T>) newLeft).value) < 0) {
			return newNode.rightRotate();
		}

		// RR
		if (balance < -1 && comparator.compare(element, ((AVLNodeFilled<T>) newRight).value) > 0) {
			return newNode.leftRotate();
		}

		// LR
		if (balance > 1 && comparator.compare(element, ((AVLNodeFilled<T>) newLeft).value) > 0) {
			AVLNodeFilled<T> newLeftRotated = ((AVLNodeFilled<T>) newLeft).leftRotate();
			return new AVLNodeFilled<>(comparator, value, newLeftRotated, newRight).rightRotate();
		}

		// RL
		if (balance < -1 && comparator.compare(element, ((AVLNodeFilled<T>) newRight).value) < 0) {
			AVLNodeFilled<T> newRightRotated = ((AVLNodeFilled<T>) newRight).rightRotate();
			return new AVLNodeFilled<>(comparator, value, newLeft, newRightRotated).leftRotate();
		}

		return newNode;
	}

	/**
	 * Executes a left rotation on the current node, as defined
	 * by the AVL Tree algorithm.
	 * @return the new node taking this node's place after rotation
	 */
	private AVLNodeFilled<T> leftRotate() {
		// TODO: Complete this method
		AVLNodeFilled<T> newRoot = (AVLNodeFilled<T>) this.right;
		AVLNode<T> movedSubtree = newRoot.left;

		return new AVLNodeFilled<>(
				comparator,
				newRoot.value,
				new AVLNodeFilled<>(comparator, this.value, this.left, movedSubtree),
				newRoot.right
		);
	}

	/**
	 * Executes a right rotation on the current node, as defined
	 * by the AVL Tree algorithm.
	 * @return the new node taking this node's place after rotation
	 */
	private AVLNodeFilled<T> rightRotate() {
		// TODO: Complete this method
		AVLNodeFilled<T> newRoot = (AVLNodeFilled<T>) this.left;
		AVLNode<T> movedSubtree = newRoot.right;

		return new AVLNodeFilled<>(
				comparator,
				newRoot.value,
				newRoot.left,
				new AVLNodeFilled<>(comparator, this.value, movedSubtree, this.right)
		);
	}

	public T getAtIndex(int i) {
		if (i < left.size()) return left.getAtIndex(i);
		else if (i == left.size()) return value;
		return right.getAtIndex(i - left.size() - 1);
	}

	public boolean contains(T element) {
		if (comparator.compare(value, element) < 0) {
			return right.contains(element);
		} else if (comparator.compare(element, value) < 0) {
			return left.contains(element);
		}
		return true;
	}

	public T get(T element) {
		if (comparator.compare(value, element) < 0) {
			return right.get(element);
		} else if (comparator.compare(element, value) < 0) {
			return left.get(element);
		}
		return value;
	}
}

```
