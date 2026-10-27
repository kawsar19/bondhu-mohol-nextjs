import type { Messages } from '../types'
import type { auth as En } from '../en/auth'

export const auth: Messages<typeof En> = {
  adminPanel: 'অ্যাডমিন প্যানেল',
  signIn: 'লগইন',
  signInHint: 'রেস্টুরেন্ট চালাতে আপনার স্টাফ অ্যাকাউন্ট দিয়ে লগইন করুন।',
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড',
  couldNotSignIn: 'লগইন করা যায়নি',
  required: 'ইমেইল আর পাসওয়ার্ড দিন',
  wrongCredentials: 'ইমেইল বা পাসওয়ার্ড ভুল',
  accountDisabled: 'এই অ্যাকাউন্ট বন্ধ করা আছে। অ্যাডমিনকে বলুন।',
  tooManyOne: 'অনেকবার ভুল চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন।',
  tooManyMany: 'অনেকবার ভুল চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন।',
}
