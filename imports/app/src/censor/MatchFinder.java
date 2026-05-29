package censor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class MatchFinder {
    private MatchFinder() { }

    static List<CensorMatch> find(NormalizedMessage message, String[] profaneWords, String[] safeWords) {
        List<CensorMatch> matches = new ArrayList<>();
        Set<String> safe = new HashSet<>(Arrays.asList(safeWords));
        for (int offset = 0; offset < message.length(); offset++) {
            addMatchesAt(message, profaneWords, safe, offset, matches);
        }
        return matches;
    }

    private static void addMatchesAt(NormalizedMessage message, String[] words,
                                     Set<String> safe, int offset, List<CensorMatch> matches) {
        for (String word : words) {
            if (!message.startsWith(word, offset)) continue;
            CensorMatch match = new CensorMatch(offset, offset + word.length());
            if (!safe.contains(message.rawWordAround(match))) matches.add(match);
        }
    }
}
