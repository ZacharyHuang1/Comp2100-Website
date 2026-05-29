package censor;

public interface ICensor {
    /**
     * Censors a given message while preserving the public module interface.
     *
     * @param message the message to censor
     * @return the censored message
     */
    String censorMessage(String message);
}
