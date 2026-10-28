import type { Messages } from '../types'
import type { common as En } from '../en/common'

export const common: Messages<typeof En> = {
  language: 'ভাষা',
  save: 'সেভ করুন',
  saveChanges: 'পরিবর্তন সেভ করুন',
  cancel: 'বাতিল',
  delete: 'মুছুন',
  edit: 'এডিট',
  close: 'বন্ধ করুন',
  refresh: 'রিফ্রেশ',
  add: 'যোগ করুন',
  search: 'খুঁজুন',
  loading: 'লোড হচ্ছে…',
  optional: '(ঐচ্ছিক)',
  total: 'মোট',
  somethingWentWrong: 'কিছু একটা সমস্যা হয়েছে',
  invalidRequest: 'অনুরোধটি সঠিক নয়',
  notSignedIn: 'লগইন করা নেই',
  roleNotAllowed: 'আপনার পদে এই কাজের অনুমতি নেই',
  orderStatus: { Completed: 'সম্পন্ন', Cancelled: 'বাতিল' },
  orderType: { 'Dine in': 'দোকানে খাবেন', Takeaway: 'নিয়ে যাবেন' },
  tableStatus: { Available: 'খালি', Occupied: 'ব্যস্ত', Reserved: 'সংরক্ষিত' },
  paymentStatus: { Paid: 'পরিশোধিত', Unpaid: 'বাকি' },
  table: 'টেবিল {number}',
}
