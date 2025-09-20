// Usage:
// 1. Register custom events with a schema
// 2. Emit custom events by name

import { EventBus } from "bussin-js";

// Shared event bus for all tracking events
export const eventBus = new EventBus([]);

const registeredEvents = {};

/**
 * Registers a custom event type and its schema.
 * @param {string} eventName - The name of the event.
 * @param {object} schema - The schema definition for the event payload.
 */
export function registerEvent(eventName, schema) {
  // Prevent duplicate registration
  if (registeredEvents[eventName]) return;
  registeredEvents[eventName] = schema;
  // Add the event type to the tracking event bus if not already present
  if (!eventBus.hasType(eventName)) {
    eventBus.addType(eventName);
  }
}

/**
 * Emits a custom event if registered and payload matches schema.
 * @param {string} eventName - The name of the event to emit.
 * @param {object} payload - The event payload.
 * @returns {boolean} - True if emitted, false if not registered or invalid payload.
 */
export function emitEvent(eventName, payload) {
  const schema = registeredEvents[eventName];
  if (!schema) return false;
  // Simple schema validation: check required keys and types
  for (const key in schema) {
    if (!(key in payload)) return false;
    if (typeof payload[key] !== schema[key]) return false;
  }
  // Emit on the shared tracking event bus
  eventBus.emit(eventName, payload);
  return true;
}
