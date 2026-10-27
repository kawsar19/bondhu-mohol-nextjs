/** Same shape as the English messages, with every leaf a string. Missing or extra keys fail type-checking. */
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> }

/** "orders.takePayment"-style paths to every string in a message tree. */
export type Paths<T> = { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string]

export type Vars = Record<string, string | number>
