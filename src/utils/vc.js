const { verifyVc } = require('@windingtree/vc');

module.exports.validateVc = async (
    proof, // verificationMethod
    did,
    claim,
    resolver,
    issuerDidDocument = null
) => {
    if (resolver) {
        // Fetch verification method did
        const didResult = await resolver.resolve(proof);
        issuerDidDocument = didResult.didDocument;
    }

    if (!issuerDidDocument) {
        throw new Error('Unable to resolve issuer DID document');
    }

    const vc = issuerDidDocument.trust.credentials.filter(c => c.id === proof)[0];

    if (!vc) {
        throw new Error('Unable to find VC');
    }

    const verificationKey = issuerDidDocument.publicKey
        .filter(k => k.id === vc.proof.verificationMethod)[0];

    if (!verificationKey) {
        throw new Error(`Unable to resolve VC verification method ${vc.proof.verificationMethod}`);
    }

    // Validate VC integrity
    const verificationResult = verifyVc(
        vc,
        vc.proof.type,
        verificationKey.publicKeyPem
    );

    // Validate VC holder. Should be a company DID
    if (verificationResult.holder.id !== did) {
        throw new Error(`Unknown holder Id ${verificationResult.holder.id}`);
    }

    // Validate a credential subject Id. Should be a company DID
    if (verificationResult.credentialSubject.id !== did) {
        throw new Error(`Unknown credential subject Id ${verificationResult.credentialSubject.id}`);
    }

    // Validate a credential subject Claim.
    // Should be a provided trust assertion claim
    if (verificationResult.credentialSubject.claim !== claim) {
        throw new Error(`Unknown credential subject Claim ${verificationResult.credentialSubject.claim}`);
    }

    return true;
};
