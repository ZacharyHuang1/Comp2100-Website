package hackathon;

import dao.model.Message;
import dao.model.Post;
import dao.model.User;
import java.util.UUID;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Tests DS39: Post reachability and shortest path.
 */
public class DS39_PostReachabilityAndShortestPathTest {
    // Verifies that a new graph has no nodes or edges.
    @Test
    public void emptyGraphHasNoEdges() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        assertEquals(0, graph.nodeCount());
        assertEquals(0, graph.edgeCount());
    }

    // Verifies that adding a connection records both endpoints.
    @Test
    public void addConnectionCreatesNeighbor() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        graph.addConnection(a, b);
        assertTrue(graph.neighbors(a).contains(b));
        assertEquals(2, graph.nodeCount());
    }

    // Verifies that duplicate connections count once.
    @Test
    public void duplicateConnectionIsIgnored() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        graph.addConnection(a, b);
        graph.addConnection(a, b);
        assertEquals(1, graph.edgeCount());
    }

    // Verifies reachability across multiple hops.
    @Test
    public void reachabilityUsesBreadthFirstSearch() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID cNode = UUID.randomUUID();
        graph.addConnection(a, b);
        graph.addConnection(b, cNode);
        assertTrue(graph.isReachable(a, cNode));
        assertEquals(2, graph.shortestDistance(a, cNode));
    }

    // Verifies that removing a connection breaks reachability.
    @Test
    public void removeConnectionUpdatesGraph() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        graph.addConnection(a, b);
        assertTrue(graph.removeConnection(a, b));
        assertFalse(graph.isReachable(a, b));
    }
    // Verifies MiniLab model relationships create graph edges.
    @Test
    public void miniLabModelRelationshipsCreateEdges() {
        DS39_PostReachabilityAndShortestPath graph = new DS39_PostReachabilityAndShortestPath();
        Post first = post("first");
        Post second = post("second");
        User viewer = user("viewer");
        User author = user("author");
        Message reply = message(first.id, "reply", 5L);
        graph.addPostRelationship(first, second);
        graph.addUserRelationship(viewer, author);
        graph.addThreadMessage(reply);
        assertTrue(graph.neighbors(first.id).contains(second.id));
        assertTrue(graph.neighbors(viewer.id()).contains(author.id()));
        assertTrue(graph.neighbors(first.id).contains(reply.id()));
    }

    // Creates a MiniLab Post for integration tests.
    private Post post(String topic) {
        return new Post(UUID.randomUUID(), UUID.randomUUID(), topic);
    }

    // Creates a MiniLab Message for integration tests.
    private Message message(UUID thread, String text, long timestamp) {
        return new Message(UUID.randomUUID(), UUID.randomUUID(), thread, timestamp, text);
    }

    // Creates a MiniLab User for integration tests.
    private User user(String username) {
        return new User(UUID.randomUUID(), User.Role.Member, username, "password");
    }


}
