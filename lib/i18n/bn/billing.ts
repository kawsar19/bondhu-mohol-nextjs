import type { Messages } from '../types'
import type { billing as En } from '../en/billing'

export const billing: Messages<typeof En> = {
  method: { Cash: 'ক্যাশ', bKash: 'bKash', Nagad: 'Nagad', Card: 'কার্ড' },
  eyebrow: 'টেবিলের বিল',
  dialogLabel: 'টেবিল {number}-এর বিল',
  ordersOne: '{count}টি অর্ডার: {codes}',
  ordersMany: '{count}টি অর্ডার: {codes}',
  notServedOne: '{codes} এখনো কিচেনে আছে। পেমেন্ট হয়ে যাবে, তবে পরিবেশন না হওয়া পর্যন্ত অর্ডারটি খোলা থাকবে।',
  notServedMany: '{codes} এখনো কিচেনে আছে। পেমেন্ট হয়ে যাবে, তবে পরিবেশন না হওয়া পর্যন্ত অর্ডারগুলো খোলা থাকবে।',
  printFirst: 'আগে বিল প্রিন্ট করুন',
  paidWith: 'পেমেন্টের মাধ্যম',
  settleHint: 'সব অর্ডার পরিশোধিত হবে, পরিবেশিতগুলো বন্ধ হবে এবং রসিদ প্রিন্ট হবে।',
  payFailed: 'পেমেন্ট নেওয়া যায়নি',
  receipt: {
    order: 'অর্ডার',
    date: 'তারিখ',
    item: 'আইটেম',
    qty: 'পরিমাণ',
    amount: 'দাম',
    each: 'প্রতিটি {price}',
    total: 'মোট',
    paid: 'পরিশোধিত',
    unpaid: 'বাকি',
  },
  api: {
    chooseOrders: 'কোন অর্ডারগুলোর পেমেন্ট নেবেন বাছুন',
    chooseMethod: 'কীভাবে পেমেন্ট হলো বাছুন: ক্যাশ, bKash, Nagad বা কার্ড',
    ordersGone: 'কিছু অর্ডার আর নেই। রিফ্রেশ করে আবার চেষ্টা করুন।',
    alreadyCancelled: '{code} আগেই বাতিল হয়েছে। রিফ্রেশ করে আবার চেষ্টা করুন।',
    alreadyPaid: '{code}-এর পেমেন্ট আগেই হয়েছে। রিফ্রেশ করে আবার চেষ্টা করুন।',
  },
}
