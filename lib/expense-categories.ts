// The categories a new shop starts with. After that they live in the database and the
// admin can add, rename, hide or delete them from the Expenses screen.
export const DEFAULT_EXPENSE_CATEGORIES: { name: string; hint: string }[] = [
  { name: 'Bazar', hint: 'কাঁচাবাজার: মাছ, মাংস, সবজি, দুধ' },
  { name: 'Grocery', hint: 'মুদি: চাল, তেল, মসলা, চিনি, চা-পাতা' },
  { name: 'Gas & fuel', hint: 'গ্যাস সিলিন্ডার, লাকড়ি' },
  { name: 'Salary', hint: 'স্টাফের বেতন, মজুরি' },
  { name: 'Rent', hint: 'দোকান ভাড়া' },
  { name: 'Utility bills', hint: 'বিদ্যুৎ, পানি, ইন্টারনেট' },
  { name: 'Equipment', hint: 'হাঁড়ি-পাতিল, ফার্নিচার, মেরামত' },
  { name: 'Other', hint: 'অন্য যেকোনো খরচ' },
]
