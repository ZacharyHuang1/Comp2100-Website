package hackathon;

import dao.model.Message;
import dao.model.Post;
import dao.model.User;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;

/**
 * DS06 practice implementation for user-to-message index.
 */
public class DS06_UserToMessageIndex {
    private final Map<UUID, List<UUID>> children = new LinkedHashMap<>();
    private final Map<UUID, UUID> parent = new HashMap<>();

    // Creates an empty tree index.
    public DS06_UserToMessageIndex() {
    }

    // Adds a root node if it is not already present.
    public void addRoot(UUID id) {
        children.computeIfAbsent(Objects.requireNonNull(id, "id"), key -> new ArrayList<>());
    }

    // Adds a child below a parent node.
    public void addChild(UUID parentId, UUID childId) {
        addRoot(parentId);
        addRoot(childId);
        children.get(parentId).add(childId);
        parent.put(childId, parentId);
    }

    // Returns direct children of a node.
    public List<UUID> childrenOf(UUID id) {
        return new ArrayList<>(children.getOrDefault(id, Collections.emptyList()));
    }

    // Returns nodes in depth-first order from a root.
    public List<UUID> depthFirst(UUID root) {
        List<UUID> result = new ArrayList<>();
        walkDepth(root, result);
        return result;
    }

    // Returns nodes in breadth-first order from a root.
    public List<UUID> breadthFirst(UUID root) {
        List<UUID> result = new ArrayList<>();
        Queue<UUID> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            UUID current = queue.remove();
            if (!children.containsKey(current)) {
                continue;
            }
            result.add(current);
            queue.addAll(children.get(current));
        }
        return result;
    }

    // Returns the parent of a node when known.
    public Optional<UUID> parentOf(UUID id) {
        return Optional.ofNullable(parent.get(id));
    }

    // Counts nodes known to the tree.
    public int nodeCount() {
        return children.size();
    }

    // Walks a tree recursively in depth-first order.
    private void walkDepth(UUID node, List<UUID> result) {
        if (!children.containsKey(node)) {
            return;
        }
        result.add(node);
        for (UUID child : children.get(node)) {
            walkDepth(child, result);
        }
    }
    // Adds a MiniLab Post as a root node.
    public void addPostRoot(Post post) {
        if (post != null) {
            addRoot(post.id);
        }
    }

    // Adds a MiniLab Message below its thread id.
    public void addMessageUnderThread(Message message) {
        if (message != null) {
            addChild(message.thread(), message.id());
        }
    }

    // Adds a MiniLab User as a root node.
    public void addUserRoot(User user) {
        if (user != null) {
            addRoot(user.id());
        }
    }


}
