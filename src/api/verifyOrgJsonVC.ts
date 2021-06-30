import type {
  ORGJSON
} from '@windingtree/org.json-schema';
import type {
  SignedVC
} from '@windingtree/org.id-auth/dist/vc';

import orgJsonSchema from '@windingtree/org.json-schema';
import { object } from '@windingtree/org.id-utils';
import { verifyVC } from '@windingtree/org.id-auth/dist/vc';


// Verify ORG.JSON VC
export const verifyOrgJsonVC = async (
  vc: SignedVC,
  orgIdOwnerBlockchainAccountId: string
): Promise<ORGJSON> => {
  // Verify ORG.JSON VC type
  const vcTypes = object.getDeepValue(vc, 'type');

  // Must includes type ORG.JSON
  if (!Array.isArray(vcTypes) || !vcTypes.includes('ORG.JSON')) {
    throw new Error('ORG.JSON VC type must include ORG.JSON type');
  }

  // Extract unsafe ORG.JSON source
  const unsafeOrgJson = object.getDeepValue(vc, 'credentialSubject');

  if (typeof unsafeOrgJson === 'undefined') {
    throw new Error('Credential subject not defined');
  }

  // Validate ORG.JSON against the schema
  const orgJsonValidationResult = object.validateWithSchemaOrRef(
    {},
    orgJsonSchema,
    unsafeOrgJson
  );

  if (orgJsonValidationResult) {
    throw new Error(`ORG.JSON schema validation: ${orgJsonValidationResult}`);
  }

  // Extract verification method Id
  const verificationMethodId = object.getDeepValue(
    vc,
    'proof.verificationMethod'
  );

  if (typeof verificationMethodId === 'undefined') {
    throw new Error('ORG.JSON VC proof must contain verificationMethod');
  }

  // Extract verification method from the unsafe ORG.JSON
  const verificationMethodScope = (unsafeOrgJson as ORGJSON).verificationMethod;

  if (
    !Array.isArray(verificationMethodScope) ||
    verificationMethodScope.length === 0
  ) {
    throw new Error('Unsafe ORG.JSON source must contain verificationMethod');
  }

  // Extract verification method by its Id from the unsafe ORG.JSON
  const verificationMethod = verificationMethodScope.filter(
    v => v.id === verificationMethodId
  )[0];

  if (typeof verificationMethod === 'undefined') {
    throw new Error(
      'ORG.JSON VC proof verificationMethod not found in unsafe ORG.JSON source'
    );
  }

  // Verify DIDs equality
  if ((unsafeOrgJson as ORGJSON).id !== verificationMethod.controller) {
    throw new Error(
      'Unsafe ORG.JSON Id must be equal to verification method controller'
    );
  }

  // Extract verification method type
  const verificationMethodType = verificationMethod.type;

  if (verificationMethodType !== 'EcdsaSecp256k1RecoveryMethod2020') {
    throw new Error(
      `Unsupported ORG.JSON VC verificationMethod: ${verificationMethodType}`
    );
  }

  // Extract blockchainAccountId that must be there according to supported type
  const blockchainAccountId = verificationMethod.blockchainAccountId;

  if (typeof blockchainAccountId === 'undefined') {
    throw new Error(
      'ORG.JSON VC verification method blockchainAccountId not found'
    );
  }

  // Verify configured blockchainAccountId
  if (blockchainAccountId !== orgIdOwnerBlockchainAccountId) {
    throw new Error(
      `Unsafe ORG.JSON blockchainAccountId of the ORGiD owner must be equal to ${orgIdOwnerBlockchainAccountId}`
    );
  }

  // Verify ORG.JSON VC
  const safePayload =  await verifyVC(vc, blockchainAccountId);

  return safePayload.credentialSubject as ORGJSON;
};
