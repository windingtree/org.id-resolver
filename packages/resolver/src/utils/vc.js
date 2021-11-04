const { verifyVc } = require('@windingtree/vc');

module.exports.validateVc = async (resolver, proof, claim) => {
    let proofDid = proof.split('#')[0];
    let sourceDid = resolver.result.didDocument.id.toLowerCase();
    let didResult;

    // Check if proof has a DID
    if (!proofDid) {
        throw new Error(`Unable to find a proof DID in the proof: ${proof}`);
    }
    // Normalize the proof DID
    proofDid = proofDid.toLowerCase();

    // Check if the source DID is the same as the proof DID
    if (proofDid === sourceDid) {
        // Take already resolved DID
        didResult = resolver.result;
    } else {
        // Make new resolution
        const proofResolver = resolver.spawnResolver();
        didResult = await proofResolver.resolve(proof);
    }
    if (!didResult) {
        throw new Error(`Unable to resolve DID of the proof: ${proof}`);
    }

    // Check if the proof DID document is valid
    const didDocumentValid = didResult.checks.filter(c => c.type === 'DID_DOCUMENT')[0];
    if (!didDocumentValid || !didDocumentValid.passed) {
        throw new Error(`DID document of the proof is not valid: ${proof}`);
    }

    // Get VC from the proof DID document
    const vc = didResult.didDocument.trust.credentials.filter(c => c.id === proof)[0];
    if (!vc) {
        throw new Error(`Unable to find VC of the proof: ${proof}`);
    }

    // Fetch verification key
    const verificationMethod = vc.proof.verificationMethod;
    let verifierDid = verificationMethod.split('#')[0];

    // Check verifier DID existence
    if (!verifierDid) {
        throw new Error(`Unable to find a verifier DID in the verificationMethod: ${verificationMethod}`);
    }
    // Normalize the verifier DID
    verifierDid = verifierDid.toLowerCase();

    let verifierDidResult;
    if (verifierDid === sourceDid) {
        verifierDidResult = resolver.result;
    } else {
        const verifierResolver = resolver.spawnResolver();
        verifierDidResult = await verifierResolver.resolve(verifierDid);
    }
    if (!verifierDidResult) {
        throw new Error(`Unable to resolve the proof verifier DID: ${verifierDid}`);
    }

    // Check if verifier DID document is valid
    const verifierDidDocumentValid = verifierDidResult.checks.filter(c => c.type === 'DID_DOCUMENT')[0];
    if (!verifierDidDocumentValid || !verifierDidDocumentValid.passed) {
        throw new Error(`DID document of the proof verifier is not valid: ${proof}`);
    }

    // Get verification key from the DID document
    const verificationKey = verifierDidResult.didDocument.publicKey.filter(c => c.id === verificationMethod)[0];
    if (!verificationKey) {
        throw new Error(`Unable to find verification key: ${verificationMethod}`);
    }

    console.log('@@@', verificationKey.publicKeyPem);

    // Validate VC integrity
    const verificationResult = verifyVc(
        vc,
        vc.proof.type,
        verificationKey.publicKeyPem
    );

    // Check if the issuer DID is defined in the VC data
    if (!verificationResult.issuer) {
        throw new Error('Unable to find issuer DID in the VC data');
    }
    // Normalize the issuer DID
    verificationResult.issuer = verificationResult.issuer.toLowerCase();

    if (resolver.authorizedTrustProofsIssuers &&
        !resolver.authorizedTrustProofsIssuers.includes(verificationResult.issuer)) {
        throw new Error(`Unauthorized trust proof issuer: ${verificationResult.issuer}`);
    }

    // Validate a credential subject Id. Should be a company DID
    if (verificationResult.credentialSubject.id !== sourceDid) {
        throw new Error(`Unknown credential subject Id ${verificationResult.credentialSubject.id}`);
    }

    // Validate a credential subject Claim.
    // Should be a provided trust assertion claim
    if (verificationResult.credentialSubject.claim !== claim) {
        throw new Error(`Unknown credential subject Claim ${verificationResult.credentialSubject.claim}`);
    }
};
