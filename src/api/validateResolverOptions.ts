import type { ResolverOptions } from '../types';

import { regexp, object } from '@windingtree/org.id-utils';

// Schema for resolver options object
export const resolverOptionsSchema = {
  type: 'object',
  properties: {
    didSubMethods: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_]+$': {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              pattern: regexp.uri.source
            },
            blockchain: {
              type: 'object',
              properties: {
                type: {
                  type: 'string'
                },
                id: {
                  type: 'string'
                }
              },
              required: [
                'type',
                'id'
              ]
            },
            address: {
              type: 'string',
              pattern: regexp.ethereumAddress.source
            }
          },
          required: [
            'provider',
            'blockchain'
          ]
        }
      }
    },
    ipfsGate: {
      type: 'string',
      pattern: regexp.uriHttp.source
    }
  },
  required: [
    'didSubMethods'
  ],
  additionalProperties: false
};

// Validate options object against the schema
export const validateResolverOptions = (options: ResolverOptions): void => {
  const result = object.validateWithSchemaOrRef(
    {},
    resolverOptionsSchema,
    options
  );

  if (result) {
    throw new Error(`Resolver options validation: ${result}`);
  }
}
