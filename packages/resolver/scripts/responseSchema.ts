import { org } from '@windingtree/org.json-schema';

const responseSchema = {
  '$id': 'responseSchema.json',
  title: 'ORGiD DID Resolution Response',
  allOf: [
    {
        '$ref': '#/definitions/DidResponse'
    }
  ],
  definitions: {
    DidResponse: {
      type: 'object',
      properties: {
        '@context': {
          '$ref': '#/definitions/ContextReference'
        },
        did: {
          '$ref': '#/definitions/DIDReference'
        },
        didDocument: {
          '$ref': '#/definitions/OrgJsonReference'
        },
        didResolutionMetadata: {
          '$ref': '#/definitions/DIDResolutionMetadata'
        },
        didDocumentMetadata: {
          '$ref': '#/definitions/DIDDocumentMetadata'
        }
      },
      required: [
        '@context',
        'did',
        'didDocument',
        'didResolutionMetadata',
        'didDocumentMetadata'
      ]
    },
    DIDResolutionMetadata: {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
          enum: [
            'application/did+ld+json'
          ]
        },
        retrieved: {
          type: 'string',
          format: 'date-time'
        },
        duration: {
          type: 'number'
        },
        resolverVersion: {
          type: 'string'
        },
        error: {
          type: 'string'
        }
      },
      required: [
        'contentType',
        'retrieved',
        'duration',
        'resolverVersion'
      ]
    },
    DIDDocumentMetadata: {
      type: 'object',
      properties: {
        created: {
          type: 'string',
          format: 'date-time'
        },
        updated: {
          type: 'string',
          format: 'date-time'
        },
        deactivated: {
          type: 'string',
          format: 'date-time'
        },
        data: {
          '$ref': '#/definitions/OrgIdData'
        }
      }
    },
    OrgIdData: {
      type: 'object',
      properties: {
        tokenId: {
          type: 'string'
        },
        orgId: {
          type: 'string'
        },
        owner: {
          type: 'string'
        },
        orgJsonUri: {
          type: 'string'
        },
        delegates: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        created: {
          type: 'string'
        }
      },
      required: [
        'tokenId',
        'orgId',
        'owner',
        'orgJsonUri',
        'delegates',
        'created'
      ]
    },
    ...org.definitions
  }
};

console.log(JSON.stringify(responseSchema, null, 2));
