import java.util.*;

import sorteddata.SortedData;
import sorteddata.avltree.AVLTree;
import sorteddata.bstree.BSTree;
import sorteddata.sortedarraylist.SortedArrayList;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameter;
import org.junit.runners.Parameterized.Parameters;

import static org.junit.Assert.*;

@RunWith(Parameterized.class)
public class SortedDataEfficiencyTests {

	@Parameters(name = "{1}")
	public static Object[] data() {
		return new Object[] {
				new Object[] {((SortedDataConstructor<Integer>) () -> new AVLTree<Integer>(Comparator.naturalOrder())), "AVLTree"},
				new Object[] {((SortedDataConstructor<Integer>) () -> new BSTree<Integer>(Comparator.naturalOrder())), "BSTree"},
				new Object[] {((SortedDataConstructor<Integer>) () -> new SortedArrayList<Integer>(Comparator.naturalOrder())), "SortedArrayList"},
		};
	}

	private interface SortedDataConstructor<T> {
		SortedData<T> construct();
	}

	@Parameter(0)
	public SortedDataConstructor<Integer> factory;

	@Parameter(1)
	public String name;

	@Test(timeout = 100)
	public void testEmpty() {
		testData(new Integer[] {});
	}

	@Test(timeout = 100)
	public void testSingle() {
		testData(new Integer[] {8});
	}

	@Test(timeout = 100)
	public void testTiny() {
		testData(new Integer[] {3, 1, 2});
	}

	@Test(timeout = 100)
	public void testSmall() {
		testData(new Integer[] {2, 7, 3, 4, 6, 1, 5});
	}

	@Test(timeout = 100)
	public void testLarge() {
		testData(new Integer[] {85, 36, 19, 14, 83, 96, 41, 67, 50, 23, 81, 20, 53, 59, 92, 77, 44, 9, 71, 80});
	}

	@Test(timeout = 3000)
	public void testMassive() {
		Integer[] data = new Integer[500_000];
		for (long i = 0; i < 500_000; i++) {
			data[(int)i] = (int) ((i*32479L + 850921L) % 10_000_000);
		}
		testData(data);
	}

	@Test(timeout = 3000)
	public void testMassiveDegenerate() {
		Integer[] data = new Integer[500_000];
		for (int i = 0; i < 500_000; i++) {
			data[i] = i;
		}
		testData(data);
	}

	@Test(timeout = 1000)
	public void testDuplicates() {
		Integer[] data = new Integer[50];
		for (int i = 0; i < 50; i++) {
			data[i] = (i % 20) * 3 + 1;
		}
		testData(data);
	}

	public void testData(Integer[] data) {
		SortedData<Integer> dataStructure = factory.construct();

		int largest = 0;
		for (Integer i : data) {
			dataStructure.insert(i);
			if (i > largest) largest = i;
		}

		int testFrequency = largest < 4 ? 1 : (largest/4);
		for (int i = 0; i < largest; i += testFrequency) {
			boolean found = false;
			for (Integer datum : data) {
				if (datum == i) {
					found = true;
					break;
				}
			}
			if (!found) {
				assertNull("Data structure contains %s".formatted(i), dataStructure.get(i));
			}
		}

		for (int i : data) {
			assertNotNull("Data structure does not contain %s".formatted(i), dataStructure.get(i));
		}
	}
}