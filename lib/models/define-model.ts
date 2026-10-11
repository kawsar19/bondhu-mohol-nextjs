import { deleteModel, model, models, type Model, type Schema } from 'mongoose'

/**
 * Registers a model once. In development, hot reload re-runs model files, so the
 * cached model is replaced to make schema edits take effect without a restart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineModel<T>(name: string, schema: Schema<any>): Model<T> {
  if (models[name]) {
    if (process.env.NODE_ENV === 'production') return models[name] as Model<T>
    deleteModel(name)
  }
  return model(name, schema) as unknown as Model<T>
}
