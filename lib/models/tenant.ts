import { Schema } from 'mongoose'

// Every shop's data lives in the same collections, told apart by `shop`. This plugin adds the field
// and refuses any query that doesn't filter by it, so a forgotten filter fails loudly instead of
// showing one shop's orders to another. Populate passes `match: { shop }` for the same reason.
// The few lookups that must cross shops (login, loading the signed-in user) pass { skipTenant: true }.

export class MissingShopError extends Error {
  constructor(model: string, op: string) {
    super(`${model}.${op}() ran without a shop filter`)
  }
}

const QUERY_OPS = [
  'find',
  'findOne',
  'countDocuments',
  'distinct',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
] as const

const hasShop = (filter: Record<string, unknown> | undefined) => filter?.shop != null

// Put in each schema's own definition (not added by the plugin) so InferSchemaType sees it.
export const shopField = { type: Schema.Types.ObjectId, ref: 'Shop', required: true, immutable: true } as const

export function tenantPlugin(schema: Schema) {
  if (!schema.path('shop')) throw new Error('tenantPlugin needs a `shop: shopField` path in the schema')

  for (const op of QUERY_OPS) {
    // Typed as one op so `this` is a Query; the body is the same for all of them.
    schema.pre(op as 'find', function () {
      if (this.getOptions().skipTenant) return
      if (!hasShop(this.getFilter())) throw new MissingShopError(this.model.modelName, op)
    })
  }

  // Aggregations must start with a $match on shop; $lookup stages only follow ids from those documents.
  schema.pre('aggregate', function () {
    const first = this.pipeline()[0] as { $match?: Record<string, unknown> } | undefined
    if (!hasShop(first?.$match)) throw new MissingShopError(this.model().modelName, 'aggregate')
  })
}

declare module 'mongoose' {
  interface QueryOptions {
    /** Lets one query run across every shop. Only for login and loading the signed-in user. */
    skipTenant?: boolean
  }
}
