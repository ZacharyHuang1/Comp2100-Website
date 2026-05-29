package censor;

import java.util.List;

final class TextMasker {
    private TextMasker() { }

    static String apply(String message, NormalizedMessage normalized, List<CensorMatch> matches) {
        char[] output = message.toCharArray();
        for (CensorMatch match : matches) maskMatch(output, normalized, match);
        return new String(output);
    }

    private static void maskMatch(char[] output, NormalizedMessage normalized, CensorMatch match) {
        for (int i = match.start() + 1; i < match.end(); i++) {
            output[normalized.rawIndex(i)] = '*';
        }
    }
}
