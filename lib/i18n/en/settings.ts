// Admin settings screen (shop details) and the /api/shop messages.
export const settings = {
  eyebrow: 'Settings',
  title: 'Shop details',
  subtitle: 'Printed at the top and bottom of every receipt and report.',
  readOnly: 'Only an admin can change these.',
  saved: 'Saved',
  saveFailed: 'Could not save shop details',
  prefixHint: 'New orders are numbered like {example}. Old orders keep their codes.',
  fields: {
    name: 'Shop name',
    tagline: 'Tagline',
    address: 'Address',
    phone: 'Phone',
    thanks: 'Thank-you line on the receipt',
    orderPrefix: 'Order code prefix',
  },
  api: {
    notFound: 'Shop not found',
    nameRequired: 'Shop name is required',
    tooLong: '{field} can be at most {max} characters',
    prefixInvalid: 'Order code prefix must be 1 to 6 English letters or digits',
  },
}
