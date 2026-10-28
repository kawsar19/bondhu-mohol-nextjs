// Payment buttons, table bill, printed receipt and /api/orders/settle.
export const billing = {
  // Display names for stored payment methods. Keyed by the stored value.
  method: { Cash: 'Cash', bKash: 'bKash', Nagad: 'Nagad', Card: 'Card' },
  eyebrow: 'Table bill',
  dialogLabel: 'Bill for table {number}',
  ordersOne: '{count} order: {codes}',
  ordersMany: '{count} orders: {codes}',
  printFirst: 'Print bill first',
  paidWith: 'Paid with',
  settleHint: 'Marks every order paid and prints the receipt.',
  payFailed: 'Could not take the payment',
  receipt: {
    order: 'Order',
    date: 'Date',
    item: 'Item',
    qty: 'Qty',
    amount: 'Amount',
    each: '{price} each',
    total: 'Total',
    paid: 'PAID',
    unpaid: 'UNPAID',
  },
  api: {
    chooseOrders: 'Choose the orders to pay for',
    chooseMethod: 'Choose how it was paid: Cash, bKash, Nagad or Card',
    ordersGone: 'Some of these orders no longer exist. Refresh and try again.',
    alreadyCancelled: '{code} is already cancelled. Refresh and try again.',
    alreadyPaid: '{code} is already paid. Refresh and try again.',
  },
}
