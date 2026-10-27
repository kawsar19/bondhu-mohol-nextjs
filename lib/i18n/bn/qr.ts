import type { Messages } from '../types'
import type { qr as En } from '../en/qr'

export const qr: Messages<typeof En> = {
  eyebrow: 'QR অর্ডার',
  title: 'টেবিলের QR কোড',
  print: 'প্রিন্ট',
  printOne: '{count}টি কার্ড প্রিন্ট',
  printMany: '{count}টি কার্ড প্রিন্ট',
  baseLabel: 'মেনু লিংক (আপনার ওয়েবসাইটের ঠিকানা)',
  linkHintBefore: 'প্রতিটি টেবিলের কোড খুলবে',
  linkHintAfter: '— টেবিল নম্বর আগে থেকেই বসানো থাকবে।',
  baseInvalid: 'https:// দিয়ে শুরু করে পুরো ঠিকানা লিখুন',
  localWarning: 'অতিথিদের ফোনে "localhost" খুলবে না। প্রিন্টের আগে আপনার লাইভ ওয়েবসাইটের ঠিকানা দিন। একই Wi-Fi-তে পরীক্ষা করতে এই কম্পিউটারের নেটওয়ার্ক ঠিকানা দিন (যেমন http://192.168.0.110:3000)।',
  loadFailed: 'টেবিল লোড করা যায়নি',
  counterTitle: 'এখানে অর্ডার দিন',
  counterSubtitle: 'কাউন্টার ও টেকঅ্যাওয়ে',
  noTables: 'এখনো কোনো টেবিল নেই',
  selectedCount: '{total}টির মধ্যে {chosen}টি বাছাই করা',
  addTables: 'টেবিল যোগ করুন',
  clearSelection: 'বাছাই মুছুন',
  selectAll: 'সব বাছাই করুন',
  willPrint: 'প্রিন্ট হবে',
  tapToInclude: 'যোগ করতে ট্যাপ করুন',
  scanToOrder: 'স্ক্যান করে অর্ডার দিন',
  scanToOrderAlt: 'Scan to order',
}
