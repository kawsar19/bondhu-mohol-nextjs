import type { Messages } from '../types'
import type { dates as En } from '../en/dates'

export const dates: Messages<typeof En> = {
  presets: { today: 'আজ', yesterday: 'গতকাল', last7: 'গত 7 দিন', thisMonth: 'এই মাস', lastMonth: 'গত মাস' },
  from: 'শুরুর তারিখ',
  to: 'শেষের তারিখ',
  rangeTo: 'থেকে',
  invalidRange: 'সঠিক শুরু ও শেষের তারিখ বাছুন',
  toBeforeFrom: 'শেষের তারিখ শুরুর তারিখের আগে পড়েছে',
  rangeTooLong: 'সর্বোচ্চ {max} দিনের সময় বাছুন',
}
