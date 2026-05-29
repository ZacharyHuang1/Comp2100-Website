import org.junit.runners.Parameterized;
import persistentdata.formatted.CSVFormat;
import persistentdata.formatted.CSVReader;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.Timeout;
import org.junit.runner.RunWith;

import java.io.StringReader;
import java.util.Arrays;
import java.util.Collection;
import java.util.concurrent.TimeUnit;

import static junit.framework.TestCase.assertEquals;
import static org.junit.Assert.*;

@RunWith(Parameterized.class)
public class CSVReaderTests {
	@Rule
	public Timeout timeout = new Timeout(100, TimeUnit.MILLISECONDS);

	@Parameterized.Parameter(0)
	public String name;

	@Parameterized.Parameter(1)
	public CSVFormat format;

	@Parameterized.Parameter(2)
	public String source;

	@Parameterized.Parameter(3)
	public String[][] expected;

	@Parameterized.Parameters(name = "{0}")
	public static Collection<Object[]> parameters() {
		return Arrays.asList(
				new Object[][] {
						{
								"simpleOneEntry",
								new CSVFormat(1),
								"A",
								new String[][] {{"A"}}},
						{
								"simpleOneLine",
								new CSVFormat(3),
								"A,B,C",
								new String[][] {{"A", "B", "C"}}},
						{
								"simpleMultiLineOneEntry",
								new CSVFormat(1),
								"A\nB\nC",
								new String[][] {{"A"}, {"B"}, {"C"}}},
						{
								"simpleMultiLine",
								new CSVFormat(3),
								"A,B,C\nD,E,F\nG,H,I\nJ,K,L",
								new String[][] {
										{"A", "B", "C"},
										{"D", "E", "F"},
										{"G", "H", "I"},
										{"J", "K", "L"}}},
						{
								"customFormat",
								new CSVFormat(' ', '\t', '$', 4),
								"hello there my friend\tthis is the test",
								new String[][] {
										{"hello", "there", "my", "friend"},
										{"this", "is", "the", "test"}}},
						{
								"escapeBasic",
								new CSVFormat(4),
								"first,\"these words, in one cell\",\"this, too\",\"unnecessary\"",
								new String[][] {
										{"first", "these words, in one cell", "this, too", "unnecessary"}}},
						{
								"escapeMultiple",
								new CSVFormat(3),
								"Aristotle,\"\"\"Those who \"\"know\"\", do.\nThose who \"\"understand\"\", teach.\"\"\",wisdom\nBernardo,\"\"\"Call me \"\"B\"\".\"\"\",inspiration",
								new String[][] {
										{"Aristotle", "\"Those who \"know\", do.\nThose who \"understand\", teach.\"", "wisdom"},
										{"Bernardo", "\"Call me \"B\".\"", "inspiration"}}},
						{
								"moreEscapes",
								new CSVFormat(2),
								"\"Valerie \"\"Nine Eyes\"\" Capaldi\",$50 000 000\n\"\"\"Baby Face\"\" Marshall\",\"$100,000,000\"\nCount von Viscount,\"$1 000 000 000\"",
								new String[][] {
										{"Valerie \"Nine Eyes\" Capaldi", "$50 000 000"},
										{"\"Baby Face\" Marshall", "$100,000,000"},
										{"Count von Viscount", "$1 000 000 000"}}},
						{
								"customFormatWithEscapes",
								new CSVFormat('-', '=', '\'', 4),
								"1234-5678-90-5432=!@#-'$%''^'-&*(-)_+",
								new String[][] {
										{"1234", "5678", "90", "5432"},
										{"!@#", "$%'^", "&*(", ")_+"}}},
						{
								"emptyCells",
								new CSVFormat(6),
								",,\"\"\"\",\"\",,\"\"",
								new String[][] {
										{"", "", "\"", "", "", ""}}},
						{
								"errorNotEnoughCells",
								new CSVFormat(3),
								"A,B\nD,E,F",
								null},
						{
								"errorTooManyCells",
								new CSVFormat(3),
								"A,B,C,X\nD,E,F",
								null},
						{
								"errorEOFWhileEscaped",
								new CSVFormat(3),
								"A,B\"B,C\nD,E,F",
								null},
						{
								"errorMismatchedEscape",
								new CSVFormat(3),
								"A,B,C\nD,E,\"Da\"ta\"",
								null},
						{
								"emptyFile",
								new CSVFormat(10),
								"",
								new String[][] {},
						}
				});
	}

	@Test
	public void testFile() {
		if (expected != null) {
			CSVReader reader = new CSVReader(format, new StringReader(source));
			for (String[] strings : expected) {
				assertTrue("Reader finds too few rows", reader.hasNext());
				assertRowEquals(strings, reader.getNext());
			}
			assertFalse("Reader finds too many rows", reader.hasNext());
		} else {
			try {
				CSVReader reader = new CSVReader(format, new StringReader(source));
				for (int i = 0; i < 2; i++) {
					reader.getNext();
				}
				fail("No exception thrown, when one should have been.");
			} catch (CSVReader.CSVIOException ignored) {}
		}
	}

	private void assertRowEquals(String[] expected, String[] actual) {
		assertEquals("Mismatch in array length", expected.length, actual.length);
		for (int i = 0; i < expected.length; i++) {
			assertEquals("Mismatch at index " + i + " of array", expected[i], actual[i]);
		}
	}
}
