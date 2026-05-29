import sorteddata.avltree.AVLTestBuilder;
import sorteddata.avltree.AVLTree;
import org.junit.BeforeClass;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.junit.runners.MethodSorters;

import java.util.Comparator;
import java.util.Iterator;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertFalse;

@RunWith(JUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class AVLIteratorTests {
	/**
	 * This is an example test. You should definitely look at AVLTestBuilder to see
	 * how we produce the trees to test (and for an explanation as to why we don't
	 * rely on the AVLTree class). You may remove or modify this test case as you wish,
	 * and add as many other test cases as you wish, provided you stay within the 20
	 * function call limit.
	 */
	@Test(timeout=100)
	public void exampleTest() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(
				b.make(4,
						b.make(2),
						b.make(6, b.make(5), b.empty()))
		);
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(4, 3, false);

		assertTrue(it.hasNext());
		assertEquals(Integer.valueOf(4), it.next());
		assertEquals(Integer.valueOf(5), it.next());
		assertEquals(Integer.valueOf(6), it.next());
		// TODO: modify (or delete) this test case as you please
	}

	// TODO: write your other test cases here
	@Test(timeout=100)
	public void testEmptyRootHasNoNext() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(5, 1, false);
		assertFalse(it.hasNext());
	}

	@Test(timeout=100)
	public void testCountZeroHasNextFalseButNextStillReturnsCurrent() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(b.make(4));
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(4, 0, false);

		assertFalse(it.hasNext());
		assertEquals(Integer.valueOf(4), it.next());
	}

	@Test(timeout=100)
	public void testForwardBeginGreaterThanCurrentFindsLargerElement() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(
				b.make(4,
						b.empty(),
						b.make(6))
		);
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(5, 1, false);

		assertEquals(Integer.valueOf(6), it.next());
	}

	@Test(timeout=100)
	public void testBackwardsFromNullStartsAtRightmost() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(
				b.make(8,
						b.empty(),
						b.make(12,
								b.make(10, b.empty(), b.make(11)),
								b.empty()))
		);
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(null, 3, true);

		assertTrue(it.hasNext());
		assertEquals(Integer.valueOf(12), it.next());
		assertEquals(Integer.valueOf(11), it.next());
	}

	@Test(timeout=100)
	public void testBackwardsBeginSkipsLargerValues() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(
				b.make(8,
						b.make(4),
						b.empty())
		);
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(7, 2, true);

		assertEquals(Integer.valueOf(4), it.next());
	}

	@Test(timeout=100)
	public void testForwardFromNullStartsAtLeftmost() {
		AVLTestBuilder<Integer> b = new AVLTestBuilder<>(Comparator.<Integer>naturalOrder());
		b.setTreeRoot(
				b.make(4,
						b.make(2),
						b.make(6))
		);
		AVLTree<Integer> tree = b.getTree();

		Iterator<Integer> it = tree.getRange(null, 1, false);

		assertEquals(Integer.valueOf(2), it.next());
	}
}
