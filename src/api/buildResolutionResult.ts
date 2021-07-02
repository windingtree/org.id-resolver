import type { OrgIdData } from '@windingtree/org.id-core';
import type { ORGJSON } from '@windingtree/org.json-schema';
import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';
import type { DidResolutionResult } from '../types';

import { DateTime } from  'luxon';

// Build DID resolution result
export const buildResolutionResult = (
  resolutionStart: number,
  orgId?: OrgIdData,
  credential?: SignedVC,
  didDocument?: ORGJSON,
  error?: string
): DidResolutionResult => {
  const retrieved = DateTime.now().toISO();

  return {
    '@context': 'https://w3id.org/did-resolution/v1',
    ...(
      didDocument
        ? { didDocument }
        : {}
    ),
    didResolutionMetadata: {
      contentType: 'application/did+ld+json',
      retrieved,
      duration: Date.now() - resolutionStart,
      ...(
        orgId
          ? { orgId }
          : {}
      ),
      ...(
        credential
          ? { credential }
          : {}
      ),
      ...(
        error
          ? { error }
          : {}
      )
    },
    didDocumentMetadata: {
      ...(
        didDocument?.created
          ? { created: didDocument.created }
          : {}
      ),
      ...(
        didDocument?.updated
          ? { updated: didDocument.updated }
          : {}
      ),
      ...(
        didDocument?.deactivated
          ? { deactivated: !!didDocument.deactivated }
          : {}
      )
    }
  };
};
