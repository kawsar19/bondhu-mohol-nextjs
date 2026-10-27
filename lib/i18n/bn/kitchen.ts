import type { Messages } from '../types'
import type { kitchen as En } from '../en/kitchen'

export const kitchen: Messages<typeof En> = {
  eyebrow: 'কিচেন ডিসপ্লে',
  live: 'লাইভ',
  title: 'কিচেন',
  fullScreen: 'ফুল স্ক্রিন',
  exitFullScreen: 'ফুল স্ক্রিন বন্ধ',
  newTitle: 'নতুন',
  newEmpty: 'নতুন কোনো অর্ডার নেই',
  startCooking: 'রান্না শুরু',
  cookingTitle: 'রান্না হচ্ছে',
  cookingEmpty: 'চুলায় কিছু নেই',
  ready: 'রেডি',
  readyTitle: 'নিয়ে যাওয়ার জন্য রেডি',
  readyEmpty: 'কিছু অপেক্ষায় নেই',
  waitingForWaiter: 'ওয়েটার পরিবেশন করবেন',
  undo: 'ফেরত নিন',
  waiter: 'ওয়েটার',
  minutes: '{minutes} মিনিট',
  hoursMinutes: '{hours}ঘ {minutes}মি',
  loadFailed: 'অর্ডার লোড করা যায়নি',
  updateFailed: 'অর্ডার আপডেট করা যায়নি',
}
