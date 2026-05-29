package persistentdata.formatted;

import persistentdata.PersistentDataException;

import java.io.IOException;
import java.io.Writer;

public class CSVWriter implements FormattedWriter<String[]> {
	private final CSVFormat format;
	private final Writer writer;
	private boolean hasWrittenEntry = false;

	public CSVWriter(CSVFormat format, Writer writer) {
		this.format = format;
		this.writer = writer;
	}

	@Override
	public void putHeader() {
		// TODO: Complete this method according to the CSV specification, without using dedicated libraries
		// The CSV format does not require any extra header content and the actual data entries are written in putNext(), so I feel like I don't need to write anything.
	}

	@Override
	public void putNext(String[] data) {
		// TODO: Complete this method according to the CSV specification, without using dedicated libraries
		try {
			if (hasWrittenEntry) {
				writer.write(format.LINE_SEPARATOR);
			}

			for (int i = 0; i < data.length; i++) {
				if (i > 0) {
					writer.write(format.FIELD_SEPARATOR);
				}

				String field = data[i];
				boolean needsEscaping =
						field.indexOf(format.FIELD_SEPARATOR) >= 0
								|| field.indexOf(format.LINE_SEPARATOR) >= 0
								|| field.indexOf(format.ESCAPE_MARKER) >= 0;

				if (needsEscaping) {
					writer.write(format.ESCAPE_MARKER);
					for (int j = 0; j < field.length(); j++) {
						char c = field.charAt(j);
						if (c == format.ESCAPE_MARKER) {
							writer.write(format.ESCAPE_MARKER);
							writer.write(format.ESCAPE_MARKER);
						} else {
							writer.write(c);
						}
					}
					writer.write(format.ESCAPE_MARKER);
				} else {
					writer.write(field);
				}
			}

			hasWrittenEntry = true;
		} catch (IOException e) {
			throw new PersistentDataException(e.getMessage());
		}
	}

	@Override
	public void putFooter() {
		// TODO: Complete this method according to the CSV specification, without using dedicated libraries
		try {
			writer.flush();
		} catch (IOException e) {
			throw new PersistentDataException(e.getMessage());
		}
	}

}
