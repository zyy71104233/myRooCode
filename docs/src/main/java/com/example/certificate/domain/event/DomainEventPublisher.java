package com.example.certificate.domain.event;

public interface DomainEventPublisher {
    void publish(DomainEvent event);
    
    default void publishAll(Iterable<? extends DomainEvent> events) {
        events.forEach(this::publish);
    }
}