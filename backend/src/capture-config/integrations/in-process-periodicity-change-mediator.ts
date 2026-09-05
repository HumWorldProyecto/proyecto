import { Injectable } from '@nestjs/common';
import {
  PeriodicityChange,
  PeriodicityChangeListener,
  PeriodicityChangeNotifierPort,
  PeriodicityChangePublisherPort,
} from '../ports/periodicity-change.port';

@Injectable()
export class InProcessPeriodicityChangeMediator
  implements PeriodicityChangeNotifierPort, PeriodicityChangePublisherPort
{
  private readonly listeners = new Set<PeriodicityChangeListener>();

  subscribe(listener: PeriodicityChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async publish(change: PeriodicityChange): Promise<void> {
    const snapshot = [...this.listeners];
    await Promise.all(snapshot.map((listener) => Promise.resolve().then(() => listener(change))));
  }
}
