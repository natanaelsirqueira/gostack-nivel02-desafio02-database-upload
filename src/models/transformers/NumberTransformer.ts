import { ValueTransformer } from 'typeorm';

export default class NumberTransformer implements ValueTransformer {
  from(value: string): number {
    return JSON.parse(value);
  }

  to(value: number): string {
    return JSON.stringify(value);
  }
}
