import type { Messages } from '../types'
import type { settings as En } from '../en/settings'

export const settings: Messages<typeof En> = {
  eyebrow: 'সেটিংস',
  title: 'দোকানের তথ্য',
  subtitle: 'প্রতিটা রসিদ আর রিপোর্টের ওপরে-নিচে এগুলো ছাপা হয়।',
  readOnly: 'শুধু অ্যাডমিন এগুলো বদলাতে পারবেন।',
  saved: 'সেভ হয়েছে',
  saveFailed: 'দোকানের তথ্য সেভ করা যায়নি',
  prefixHint: 'নতুন অর্ডারের নম্বর হবে {example} এর মতো। পুরনো অর্ডারের কোড বদলাবে না।',
  fields: {
    name: 'দোকানের নাম',
    tagline: 'ট্যাগলাইন',
    address: 'ঠিকানা',
    phone: 'ফোন',
    thanks: 'রসিদের ধন্যবাদ লাইন',
    orderPrefix: 'অর্ডার কোডের শুরু',
  },
  api: {
    notFound: 'দোকান পাওয়া যায়নি',
    nameRequired: 'দোকানের নাম দিতে হবে',
    tooLong: '{field} সর্বোচ্চ {max} অক্ষরের হতে পারে',
    prefixInvalid: 'অর্ডার কোডের শুরু ১ থেকে ৬টি ইংরেজি অক্ষর বা সংখ্যা হতে হবে',
  },
}
