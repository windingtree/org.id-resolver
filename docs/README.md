@windingtree/org.id-resolver

# @windingtree/org.id-resolver

## Table of contents

### Variables

- [compiledResolverOptionsSchema](README.md#compiledresolveroptionsschema)
- [resolverOptionsSchema](README.md#resolveroptionsschema)

### Functions

- [createOrgIdContract](README.md#createorgidcontract)
- [getOrgId](README.md#getorgid)
- [validateOrgIdDidFormat](README.md#validateorgiddidformat)
- [validateResolverOptions](README.md#validateresolveroptions)

## Variables

### compiledResolverOptionsSchema

• `Const` **compiledResolverOptionsSchema**: `ValidateFunction`<`unknown`\>

#### Defined in

methods.ts:51

___

### resolverOptionsSchema

• `Const` **resolverOptionsSchema**: `AnySchema`

#### Defined in

methods.ts:19

## Functions

### createOrgIdContract

▸ `Const` **createOrgIdContract**(`didSubMethod`, `options`): `OrgIdContract`

#### Parameters

| Name | Type |
| :------ | :------ |
| `didSubMethod` | `string` |
| `options` | `ResolverOptions` |

#### Returns

`OrgIdContract`

#### Defined in

methods.ts:109

___

### getOrgId

▸ `Const` **getOrgId**(`orgIdContract`, `orgId`): `Promise`<``null`` \| `OrgIdData`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `orgIdContract` | `OrgIdContract` |
| `orgId` | `string` |

#### Returns

`Promise`<``null`` \| `OrgIdData`\>

#### Defined in

methods.ts:138

___

### validateOrgIdDidFormat

▸ `Const` **validateOrgIdDidFormat**(`didString`, `options`): `OrgIdDidParsed`

#### Parameters

| Name | Type |
| :------ | :------ |
| `didString` | `string` |
| `options` | `ResolverOptions` |

#### Returns

`OrgIdDidParsed`

#### Defined in

methods.ts:62

___

### validateResolverOptions

▸ `Const` **validateResolverOptions**(`options`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `ResolverOptions` |

#### Returns

`void`

#### Defined in

methods.ts:54
