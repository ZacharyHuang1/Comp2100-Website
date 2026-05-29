package censor;

import java.util.List;

final class ProfanityCensor extends CensorFacade { }

final class BlockingCensor extends CensorFacade {
    @Override
    String finish(String message, NormalizedMessage normalized, List<CensorMatch> matches) {
        return matches.isEmpty() ? message : "[BLOCKED]";
    }
}

final class CaseSensitiveCensor extends CensorFacade {
    @Override
    boolean keepCase() {
        return true;
    }
}

final class BernardoCensor extends CensorFacade {
    @Override
    String[] profaneWords() {
        return WordLists.BERNARDO;
    }

    @Override
    String[] safeWords() {
        return WordLists.EMPTY;
    }
}
