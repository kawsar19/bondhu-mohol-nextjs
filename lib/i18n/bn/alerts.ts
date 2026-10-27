import type { Messages } from '../types'
import type { alerts as En } from '../en/alerts'

export const alerts: Messages<typeof En> = {
  newOrder: 'নতুন অর্ডার',
  newOrderCode: 'নতুন অর্ডার {code}',
  newOrdersCount: '{count}টি নতুন অর্ডার',
  tabTitle: '({count}) নতুন অর্ডার · Bondhu Mohol',
  turnOffSound: 'নতুন অর্ডারের শব্দ বন্ধ করুন',
  turnOnSound: 'নতুন অর্ডারের শব্দ চালু করুন',
  soundIsOn: 'নতুন অর্ডারের শব্দ চালু আছে',
  soundIsOff: 'নতুন অর্ডারের শব্দ বন্ধ আছে',
  dismiss: 'সরিয়ে দিন',
  viewOrders: 'অর্ডার দেখুন',
  tapToEnableSound: 'নতুন অর্ডারের শব্দ চালু করতে এখানে চাপুন',
}
