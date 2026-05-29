import sorteddata.SortedData;
import sorteddata.avltree.AVLTree;
import sorteddata.bstree.BSTree;
import sorteddata.sortedarraylist.SortedArrayList;

import java.util.Comparator;

public class SortedDataEfficiencyComparison {
	private static void test(TestStructure structure, int size) {
		try {
			long startTime = System.nanoTime();

			for (int i = size; i > 0; i--)
				structure.sortedData().insert(i);
			long endTime = System.nanoTime();

			long duration = (endTime - startTime);
			double elapsedSeconds = (double) duration / 1_000_000_000;
			System.out.printf("%s: %ss%n", structure.name(), Math.floor(elapsedSeconds * 100) / 100);
		} catch (Exception e) {
			System.out.printf("%s: encountered exception%n", structure.name());
		} catch (StackOverflowError e) {
			System.out.printf("%s: encountered stack overflow%n", structure.name());
		}
	}

	private record TestStructure(String name, SortedData<Integer> sortedData) {}

	private static TestStructure[] makeStructures() {
		return new TestStructure[] {
				new TestStructure("          AVL tree", new AVLTree<>(Comparator.<Integer>naturalOrder())),
				new TestStructure("Binary search tree", new BSTree<>(Comparator.<Integer>naturalOrder())),
				new TestStructure(" Sorted array list", new SortedArrayList<>(Comparator.<Integer>naturalOrder())),
		};
	}

	private static final int[] SIZES = {10_000, 50_000, 100_000, 500_000, 1_000_000};

	public static void main(String[] args) {
		for (int size : SIZES) {
			System.out.printf("For %s elements...%n", size);
			for (TestStructure structure : makeStructures()) {
				test(structure, size);
			}
			System.out.println();
		}
	}
}