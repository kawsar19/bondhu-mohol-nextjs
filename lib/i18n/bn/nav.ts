import type { Messages } from '../types'
import type { nav as En } from '../en/nav'

export const nav: Messages<typeof En> = {
  sections: {
    Overview: 'সারসংক্ষেপ',
    Orders: 'অর্ডার',
    Tables: 'টেবিল',
    Menu: 'মেনু',
    'Kitchen display': 'কিচেন ডিসপ্লে',
    Reports: 'রিপোর্ট',
    Expenses: 'খরচ',
    'Waiter order panel': 'ওয়েটার অর্ডার প্যানেল',
    'QR ordering': 'QR অর্ডার',
    Staff: 'স্টাফ',
    Settings: 'সেটিংস',
  },
  tagline: 'রেস্টুরেন্ট ও চা স্টল',
  mainMenu: 'মূল মেনু',
  operations: 'কাজকর্ম',
  openCustomerMenu: 'কাস্টমার মেনু খুলুন',
  openMenu: 'মেনু খুলুন',
  closeMenu: 'মেনু বন্ধ করুন',
  closeNavigation: 'নেভিগেশন বন্ধ করুন',
  logOut: 'লগআউট',
  goodMorning: 'শুভ সকাল',
  goodAfternoon: 'শুভ দুপুর',
  goodEvening: 'শুভ সন্ধ্যা',
  hello: 'হ্যালো',
  comingSoon: 'শীঘ্রই আসছে',
  comingSoonText: 'এই অংশ এখনো তৈরি হয়নি। অর্ডার, কিচেন ডিসপ্লে, টেবিল, মেনু, ওয়েটার প্যানেল আর QR কোড এখনই ব্যবহার করা যাবে।',
}
