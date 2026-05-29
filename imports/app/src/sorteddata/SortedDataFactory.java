package sorteddata;

import java.util.Comparator;

/**
 * As of week 4, we now have an additional implementation of the Sorted Data interface,
 * namely AVLTree. By replacing just this one line of code below, we are able to change
 * the type of sorted data used across all the modelled DAO classes.
 */
public class SortedDataFactory {
	public static <T> SortedData<T> makeSortedData(Comparator<T> comparator) {
		return new sorteddata.avltree.AVLTree<>(comparator);
	}
}
