import { regexp } from '@windingtree/org.id-utils';

// Validate ORG.JSON URI (we plan to support the following methods: http, ipns)
export const validateOrgJsonUri = (uri: string): void => {
  if (!regexp.uriHttp.exec(uri) && !regexp.ipfs.exec(uri)) {
    throw new Error(`Unsupported ORG.JSON URI type: ${uri}`);
  }
};
