import type {
  ValidateFunction
} from 'ajv';
import { DefinedError } from 'ajv';

// Helper for data validation against the schema
export const validateData = (
  validator: ValidateFunction,
  data: unknown,
  prefix?: string
): void => {
  if (!validator(data)) {
    const messages: string[] = [];

    for (const error of validator.errors as DefinedError[]) {
      messages.push(
        `Error at ${error.instancePath}: ${error.message as string}`
      );
    }

    throw new Error(`${prefix ? prefix + ' ': ''}${messages.join('; ')}`);
  }
};
