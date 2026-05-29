package hackathon;

import dao.model.Message;
import dao.model.Post;
import dao.model.User;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * DS35 practice implementation for hashtag trie with frequency.
 */
public class DS35_HashtagTrieWithFrequency {
    private final Node root = new Node();
    private int wordCount;

    // Creates an empty trie.
    public DS35_HashtagTrieWithFrequency() {
    }

    // Adds one normalized word to the trie.
    public void add(String word) {
        String normalized = normalize(word);
        if (normalized.isEmpty()) {
            return;
        }
        Node current = root;
        for (char ch : normalized.toCharArray()) {
            current = current.children.computeIfAbsent(ch, key -> new Node());
        }
        if (current.frequency == 0) {
            wordCount++;
        }
        current.frequency++;
    }

    // Checks whether a full word exists in the trie.
    public boolean contains(String word) {
        Node node = nodeFor(normalize(word));
        return node != null && node.frequency > 0;
    }

    // Returns how many times a word has been added.
    public int frequency(String word) {
        Node node = nodeFor(normalize(word));
        return node == null ? 0 : node.frequency;
    }

    // Returns sorted suggestions for a prefix.
    public List<String> suggest(String prefix, int limit) {
        String normalized = normalize(prefix);
        Node node = nodeFor(normalized);
        if (node == null || limit <= 0) {
            return Collections.emptyList();
        }
        List<String> results = new ArrayList<>();
        collect(node, normalized, results, limit);
        return results;
    }

    // Returns the number of unique words stored.
    public int wordCount() {
        return wordCount;
    }

    // Returns the trie node for a prefix.
    private Node nodeFor(String value) {
        Node current = root;
        for (char ch : value.toCharArray()) {
            current = current.children.get(ch);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    // Collects words below a node in lexical order.
    private void collect(Node node, String prefix, List<String> results, int limit) {
        if (results.size() >= limit) {
            return;
        }
        if (node.frequency > 0) {
            results.add(prefix);
        }
        for (Map.Entry<Character, Node> entry : node.children.entrySet()) {
            collect(entry.getValue(), prefix + entry.getKey(), results, limit);
        }
    }

    // Normalizes a word for trie storage.
    private String normalize(String word) {
        return String.valueOf(word).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static class Node {
        private final Map<Character, Node> children = new TreeMap<>();
        private int frequency;

        // Creates an empty trie node.
        private Node() {
        }
    }
    // Adds words from a MiniLab Post topic and replies.
    public void addPost(Post post) {
        if (post == null) {
            return;
        }
        addWords(post.topic);
        Iterator<Message> messages = post.messages.getAll();
        while (messages.hasNext()) {
            addMessage(messages.next());
        }
    }

    // Adds words from a MiniLab Message body.
    public void addMessage(Message message) {
        if (message != null) {
            addWords(message.message());
        }
    }

    // Adds words from a MiniLab username.
    public void addUser(User user) {
        if (user != null) {
            addWords(user.username());
        }
    }

    // Adds every normalized word from free text.
    private void addWords(String text) {
        for (String raw : String.valueOf(text).split("[^A-Za-z0-9]+")) {
            add(raw);
        }
    }


}
