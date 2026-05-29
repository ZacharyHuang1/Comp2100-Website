import org.junit.runners.Parameterized;
import persistentdata.formatted.CSVFormat;
import persistentdata.formatted.CSVWriter;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.Timeout;
import org.junit.runner.RunWith;

import java.io.StringWriter;
import java.util.Collection;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static junit.framework.TestCase.assertEquals;

@RunWith(Parameterized.class)
public class CSVWriterTests {
	@Rule
	public Timeout timeout = new Timeout(100, TimeUnit.MILLISECONDS);

	@Parameterized.Parameter(0)
	public String name;

	@Parameterized.Parameter(1)
	public CSVFormat format;

	@Parameterized.Parameter(2)
	public String expected;

	@Parameterized.Parameter(3)
	public String[][] source;

	@Parameterized.Parameters(name = "{0}")
	public static Collection<Object[]> parameters() {
		// Use the same test cases as CSVReaderTests, just in reverse
		Collection<Object[]> objects = CSVReaderTests.parameters();
		// ... but ignore the ones that were supposed to throw errors when reading
		return objects.stream().filter(x -> (x[3] != null)).collect(Collectors.toSet());
	}

	@Test
	public void testWriting() {
		// We need to provide some Writer to examine the output of the CSVWriter.
		// Normally we would connect this to e.g. the Writer returned by an IOFactory
		// but for unit testing we can simply divert the output to a string writer.
		// This is yet another benefit of the strategy pattern!
		StringWriter out = new StringWriter();
		CSVWriter writer = new CSVWriter(format, out);
		for (String[] line : source) {
			writer.putNext(line);
		}
		String result = out.getBuffer().toString();

		// For these three test cases, the input includes additional quotes that are not
		// prescribed by the CSV specification, so we avoid testing equality in quotation marks
		if (name.equals("moreEscapes") || name.equals("emptyCells") || name.equals("escapeBasic")) {
			result = result.replaceAll("\"", "");
			expected = expected.replaceAll("\"", "");
		}
		assertEquals("Mismatch in written content", expected, result);
	}
}
