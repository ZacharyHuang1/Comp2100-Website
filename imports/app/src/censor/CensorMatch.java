package censor;

final class CensorMatch {
    private final int start;
    private final int end;

    CensorMatch(int start, int end) {
        this.start = start;
        this.end = end;
    }

    int start() {
        return start;
    }

    int end() {
        return end;
    }
}
