export class IdGenerator {
  private counters: Map<string, number>;

  constructor() {
    this.counters = new Map();
  }

  generateId(prefix: string): string {
    let counter = this.counters.get(prefix);

    if (counter === undefined) {
      counter = 0;
    } else {
      counter++;
    }

    this.counters.set(prefix, counter);
    return `${prefix}-${counter}`;
  }
}
