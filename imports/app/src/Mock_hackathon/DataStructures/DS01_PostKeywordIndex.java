package hackathon;

import dao.model.Message;
import dao.model.Post;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * DS01 practice implementation for post keyword inverted index.
 */
public class DS01_PostKeywordIndex {
    private final Map<String, Set<Post>> index = new HashMap<>();
    private final Map<Post, Set<String>> reverseIndex = new HashMap<>();
    private final Map<String, Integer> frequencies = new HashMap<>();
    private final Set<Post> indexedPosts = new LinkedHashSet<>();

    // Creates an empty post keyword index.
    public DS01_PostKeywordIndex() {
    }

    // Adds all posts from an iterator to the index.
    public DS01_PostKeywordIndex(Iterator<Post> posts) {
        if (posts == null) {
            return;
        }
        while (posts.hasNext()) {
            add(posts.next());
        }
    }

    // Adds a post topic and message text to the keyword index.
    public void add(Post post) {
        if (post == null) {
            return;
        }
        remove(post);
        Set<String> tokens = tokenize(searchableText(post));
        reverseIndex.put(post, tokens);
        indexedPosts.add(post);
        for (String token : tokens) {
            index.computeIfAbsent(token, key -> new LinkedHashSet<>()).add(post);
            frequencies.put(token, frequency(token) + 1);
        }
    }

    // Removes a post from every keyword bucket.
    public boolean remove(Post post) {
        Set<String> tokens = reverseIndex.remove(post);
        if (tokens == null) {
            return false;
        }
        indexedPosts.remove(post);
        for (String token : tokens) {
            Set<Post> bucket = index.get(token);
            if (bucket != null) {
                bucket.remove(post);
                if (bucket.isEmpty()) {
                    index.remove(token);
                }
            }
            int next = frequencies.getOrDefault(token, 1) - 1;
            if (next <= 0) {
                frequencies.remove(token);
            } else {
                frequencies.put(token, next);
            }
        }
        return true;
    }

    // Searches for posts containing all valid tokens in the query.
    public List<Post> search(String query) {
        Set<String> tokens = tokenize(query);
        if (tokens.isEmpty()) {
            return Collections.emptyList();
        }
        Iterator<String> iterator = tokens.iterator();
        Set<Post> result = new LinkedHashSet<>(index.getOrDefault(iterator.next(), Collections.emptySet()));
        while (iterator.hasNext()) {
            result.retainAll(index.getOrDefault(iterator.next(), Collections.emptySet()));
        }
        return new ArrayList<>(result);
    }

    // Returns how many indexed posts contain a token.
    public int frequency(String token) {
        return frequencies.getOrDefault(normalize(token), 0);
    }

    // Returns keywords ordered by frequency then alphabetically.
    public List<String> topKeywords(int limit) {
        List<String> keywords = new ArrayList<>(frequencies.keySet());
        keywords.sort((left, right) -> {
            int byFrequency = Integer.compare(frequencies.get(right), frequencies.get(left));
            return byFrequency != 0 ? byFrequency : left.compareTo(right);
        });
        return keywords.subList(0, Math.min(Math.max(0, limit), keywords.size()));
    }

    // Returns the number of indexed posts.
    public int size() {
        return indexedPosts.size();
    }

    // Builds searchable text from Post.topic and all Message records.
    private String searchableText(Post post) {
        StringBuilder text = new StringBuilder();
        if (post.topic != null) {
            text.append(post.topic).append(' ');
        }
        Iterator<Message> messages = post.messages.getAll();
        while (messages.hasNext()) {
            Message message = messages.next();
            if (message.message() != null) {
                text.append(message.message()).append(' ');
            }
        }
        return text.toString();
    }

    // Converts text into normalized unique tokens.
    private Set<String> tokenize(String text) {
        Set<String> tokens = new LinkedHashSet<>();
        if (text == null) {
            return tokens;
        }
        for (String raw : text.split("[^A-Za-z0-9]+")) {
            String token = normalize(raw);
            if (!token.isEmpty()) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    // Normalizes a token for case-insensitive lookup.
    private String normalize(String token) {
        return token == null ? "" : token.toLowerCase(Locale.ROOT).trim();
    }
}
