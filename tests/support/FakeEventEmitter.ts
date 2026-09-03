type EventHandler = (...args: unknown[]) => void;

interface ListenerRecord {
  handler: EventHandler;
  once: boolean;
}

/** Minimal event emitter for adapter wiring tests. */
export class FakeEventEmitter {
  private readonly listeners = new Map<string, ListenerRecord[]>();

  on(event: string, handler: EventHandler): this {
    this.addListener(event, handler, false);
    return this;
  }

  once(event: string, handler: EventHandler): this {
    this.addListener(event, handler, true);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return this;
    }

    const remaining = listeners.filter((listener) => listener.handler !== handler);

    if (remaining.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, remaining);
    }

    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return false;
    }

    for (const listener of [...listeners]) {
      if (listener.once) {
        this.removeListenerRecord(event, listener);
      }

      listener.handler(...args);
    }

    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  private addListener(event: string, handler: EventHandler, once: boolean): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push({ handler, once });
    this.listeners.set(event, listeners);
  }

  private removeListenerRecord(event: string, listenerToRemove: ListenerRecord): void {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    const remaining = listeners.filter((listener) => listener !== listenerToRemove);

    if (remaining.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, remaining);
    }
  }
}
