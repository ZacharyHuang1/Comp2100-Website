import sorteddata.avltree.AVLTree;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.Timeout;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

import java.util.Comparator;
import java.util.concurrent.TimeUnit;

import static org.junit.Assert.assertEquals;

@RunWith(JUnit4.class)
public class AVLTreeTests {
	@Rule
	public Timeout timeout = new Timeout(100, TimeUnit.MILLISECONDS);

	private static AVLTree<Integer> treeWith(int... values) {
		AVLTree<Integer> tree = new AVLTree<>(Comparator.<Integer>naturalOrder());
		for (int v : values) {
			tree.insert(v);
		}
		return tree;
	}

	@Test
	public void testEmpty() {
		assertEquals("AVLTree[.]",
				treeWith().toString());
	}

	@Test
	public void testInsertion() {
		assertEquals("AVLTree[3 -> (1, 7)]",
				treeWith(3, 1, 7).toString());
	}

	@Test
	public void testDuplicates() {
		assertEquals("AVLTree[3 -> (., 5)]",
				treeWith(3, 5, 5, 3, 5, 5, 3).toString());
	}

	@Test
	public void testLeftRotate() {
		assertEquals("AVLTree[4 -> (2, 6)]",
				treeWith(2, 4, 6).toString());
	}

	@Test
	public void testRightRotate() {
		assertEquals("AVLTree[5 -> (4, 9)]",
				treeWith(9, 5, 4).toString());
	}

	@Test
	public void testLeftRightRotate() {
		assertEquals("AVLTree[4 -> (1, 7 -> (5, 8))]",
				treeWith(4, 1, 5, 8, 7).toString());
	}

	@Test
	public void testRightLeftRotate() {
		assertEquals("AVLTree[8 -> (2 -> (0, 6), 9)]",
				treeWith(8, 6, 9, 2, 0).toString());
	}

	@Test
	public void testImmutability() {
		AVLTree<Integer> first = treeWith(5, 8, 4);
		AVLTree<Integer> second = first.clone();
		// Because the implementation should be immutable, we expect 2 will be inserted in second, but not in first
		second.insert(2);

		assertEquals("AVLTree[5 -> (4, 8)]", first.toString());
		assertEquals("AVLTree[5 -> (4 -> (2, .), 8)]", second.toString());
	}
}
