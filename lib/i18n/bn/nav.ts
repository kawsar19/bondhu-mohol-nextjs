import type { Messages } from '../types'
import type { nav as En } from '../en/nav'

export const nav: Messages<typeof En> = {
  sections: {
    Overview: 'সারসংক্ষেপ',
    'New order': 'নতুন অর্ডার',
    Orders: 'অর্ডার',
    Tables: 'টেবিল',
    Menu: 'মেনু',
    Sections: 'সেকশন',
    Ingredients: 'কাঁচামাল',
    'Mother store': 'মাদার স্টোর',
    'Daily entry': 'দৈনিক হিসাব',
    Reports: 'রিপোর্ট',
    'Day end': 'দিনশেষের রিপোর্ট',
    Expenses: 'খরচ',
    Staff: 'স্টাফ',
    Settings: 'সেটিংস',
  },
  tagline: 'রেস্টুরেন্ট ও চা স্টল',
  mainMenu: 'মূল মেনু',
  operations: 'কাজকর্ম',
  openMenu: 'মেনু খুলুন',
  closeMenu: 'মেনু বন্ধ করুন',
  closeNavigation: 'নেভিগেশন বন্ধ করুন',
  logOut: 'লগআউট',
  goodMorning: 'শুভ সকাল',
  goodAfternoon: 'শুভ দুপুর',
  goodEvening: 'শুভ সন্ধ্যা',
  hello: 'হ্যালো',
  comingSoon: 'শীঘ্রই আসছে',
  comingSoonText: 'এই অংশ এখনো তৈরি হয়নি।',
}
