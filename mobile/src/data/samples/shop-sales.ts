import { isoDay, seededRandom, weekdayOf } from './random';

// "Shop sales": October and November 2026 at a small general store in India,
// one row per item sold, about 300 rows a month. Made in code from a fixed
// seed, so every phone gets the same rows.
//
// What a person can find in it:
// - Sundays and Saturdays are busier than weekdays;
// - Navratri and Dussehra (11 to 20 October 2026) are busier, and Diwali
//   week (Dhanteras 6 November, Diwali 8 November 2026) much busier, with
//   diyas, sweets and dry fruits selling then;
// - Grocery brings in far more money than any other category, Atta most of
//   all;
// - UPI is how most of the money comes in;
// - two returns, written as minus amounts;
// - one amount typed with a zero too many (two bags of atta, 570 written as
//   5700), for the File check to find. It sits on the busiest day, on the
//   top item, category and way of paying, in the busier month, so it makes
//   totals bigger but never changes which one comes first.
//
// Checked through the shared engine: the File check finds exactly one
// unusual value (that amount), repeated rows are drawn again so there are
// none, and the first and last days differ by less than the 20 percent the
// change-over-time finding needs, so no trend is claimed from two days.
//
// Amount comes before Qty: Insights, the first finding and the suggested
// questions open on the first number column, and that should be rupees.

export const SHOP_SALES_COLUMNS = ['Date', 'Item', 'Category', 'Amount', 'Qty', 'Payment'];

export type ShopSalesRow = {
  Date: string;
  Item: string;
  Category: string;
  Amount: string;
  Qty: number;
  Payment: string;
};

type Category = 'Grocery' | 'Snacks' | 'Dairy' | 'Personal care' | 'Household';
type Payment = 'Cash' | 'UPI' | 'Card';

// One thing the shop sells. `weight`: how often it sells on an ordinary day.
// `festive`: how many times more often it sells on the most festive day.
// `maxQty`: the most pieces one customer takes.
type Item = { name: string; category: Category; price: number; weight: number; festive: number; maxQty: number };

const ITEMS: Item[] = [
  { name: 'Atta', category: 'Grocery', price: 285, weight: 10, festive: 1.3, maxQty: 1 },
  { name: 'Basmati rice', category: 'Grocery', price: 145, weight: 7, festive: 1.3, maxQty: 2 },
  { name: 'Toor dal', category: 'Grocery', price: 165, weight: 8, festive: 1, maxQty: 2 },
  { name: 'Moong dal', category: 'Grocery', price: 135, weight: 4, festive: 1, maxQty: 2 },
  { name: 'Sugar', category: 'Grocery', price: 48, weight: 8, festive: 2, maxQty: 5 },
  { name: 'Mustard oil', category: 'Grocery', price: 185, weight: 7, festive: 1.6, maxQty: 2 },
  { name: 'Besan', category: 'Grocery', price: 110, weight: 3, festive: 3, maxQty: 3 },
  { name: 'Tea', category: 'Grocery', price: 140, weight: 6, festive: 1.2, maxQty: 2 },
  { name: 'Garam masala', category: 'Grocery', price: 85, weight: 3, festive: 1.5, maxQty: 2 },
  { name: 'Poha', category: 'Grocery', price: 60, weight: 3, festive: 1, maxQty: 2 },
  { name: 'Biscuits', category: 'Snacks', price: 30, weight: 4, festive: 1.2, maxQty: 5 },
  { name: 'Namkeen', category: 'Snacks', price: 110, weight: 5, festive: 2.2, maxQty: 3 },
  { name: 'Chips', category: 'Snacks', price: 20, weight: 2, festive: 1, maxQty: 5 },
  { name: 'Cold drink', category: 'Snacks', price: 99, weight: 4, festive: 1.5, maxQty: 2 },
  { name: 'Sweets box', category: 'Snacks', price: 380, weight: 0.3, festive: 16, maxQty: 1 },
  { name: 'Dry fruits', category: 'Snacks', price: 450, weight: 0.1, festive: 18, maxQty: 1 },
  { name: 'Milk', category: 'Dairy', price: 68, weight: 9, festive: 1.3, maxQty: 3 },
  { name: 'Curd', category: 'Dairy', price: 50, weight: 4, festive: 1, maxQty: 2 },
  { name: 'Paneer', category: 'Dairy', price: 95, weight: 3, festive: 1.8, maxQty: 3 },
  { name: 'Ghee', category: 'Dairy', price: 330, weight: 1, festive: 3, maxQty: 1 },
  { name: 'Butter', category: 'Dairy', price: 62, weight: 2, festive: 1, maxQty: 2 },
  { name: 'Bath soap', category: 'Personal care', price: 45, weight: 4, festive: 1, maxQty: 4 },
  { name: 'Shampoo', category: 'Personal care', price: 185, weight: 2, festive: 1, maxQty: 1 },
  { name: 'Toothpaste', category: 'Personal care', price: 110, weight: 3, festive: 1, maxQty: 2 },
  { name: 'Hair oil', category: 'Personal care', price: 130, weight: 2, festive: 1, maxQty: 1 },
  { name: 'Detergent', category: 'Household', price: 125, weight: 4, festive: 1.3, maxQty: 2 },
  { name: 'Dishwash bar', category: 'Household', price: 30, weight: 2, festive: 1, maxQty: 4 },
  { name: 'Agarbatti', category: 'Household', price: 50, weight: 3, festive: 2.5, maxQty: 3 },
  { name: 'Diyas', category: 'Household', price: 120, weight: 0.1, festive: 26, maxQty: 3 },
  { name: 'Candles', category: 'Household', price: 60, weight: 0.1, festive: 16, maxQty: 3 },
  { name: 'Rangoli colours', category: 'Household', price: 80, weight: 0.05, festive: 20, maxQty: 2 },
];

const YEAR = 2026;
const MONTHS = [
  { month: 10, days: 31 },
  { month: 11, days: 30 },
];
const SEED = 20261001;

// Rows on an ordinary day, Sunday to Saturday.
const ROWS_BY_WEEKDAY = [11, 7, 7, 8, 7, 8, 10];

// The festival days of October and November 2026. `rush`: how many times the
// ordinary number of rows. `festive`: from 0 (an ordinary day) to 1 (the
// most festive day), how strongly festival things sell.
type Day = { rush: number; festive: number };
const ORDINARY: Day = { rush: 1, festive: 0 };

function dayOf(month: number, day: number): Day {
  if (month === 10) {
    if (day >= 11 && day <= 18) return { rush: 1.25, festive: 0.4 }; // Navratri
    if (day === 19) return { rush: 1.5, festive: 0.6 };
    if (day === 20) return { rush: 1.6, festive: 0.6 }; // Dussehra
    return ORDINARY;
  }
  if (day === 1) return { rush: 1.4, festive: 0.5 };
  if (day >= 2 && day <= 5) return { rush: 1.9, festive: 0.8 };
  if (day === 6 || day === 7) return { rush: 3, festive: 1 }; // Dhanteras, and the day after
  if (day === 8) return { rush: 2.2, festive: 1 }; // Diwali
  if (day === 9) return { rush: 0.5, festive: 0.3 }; // the shop closes early
  if (day === 10) return { rush: 0.8, festive: 0 };
  if (day === 11) return { rush: 1.3, festive: 0.5 }; // Bhai Dooj
  return ORDINARY;
}

// Rows typed in by hand that are not ordinary sales. Each goes in the middle
// of its day's rows.
const EXTRA_ROWS: ShopSalesRow[] = [
  // Typed with one zero too many on the busiest day: two bags of atta are
  // 570, not 5700.
  { Date: isoDay(YEAR, 11, 7), Item: 'Atta', Category: 'Grocery', Amount: '₹5700', Qty: 2, Payment: 'UPI' },
  // Returns, written as minus amounts. They are small, so the File check
  // does not count them as unusual.
  { Date: isoDay(YEAR, 10, 24), Item: 'Toothpaste', Category: 'Personal care', Amount: '-₹110', Qty: -1, Payment: 'UPI' },
  { Date: isoDay(YEAR, 11, 13), Item: 'Paneer', Category: 'Dairy', Amount: '-₹95', Qty: -1, Payment: 'Cash' },
];

// How a customer pays: small amounts often in cash, bigger ones mostly by
// UPI, now and then by card.
function paymentFor(amount: number, roll: number): Payment {
  if (amount < 100) return roll < 0.5 ? 'Cash' : 'UPI';
  if (amount <= 400) return roll < 0.32 ? 'Cash' : roll < 0.93 ? 'UPI' : 'Card';
  return roll < 0.2 ? 'Cash' : roll < 0.75 ? 'UPI' : 'Card';
}

export function shopSalesRows(): ShopSalesRow[] {
  const random = seededRandom(SEED);
  const rows: ShopSalesRow[] = [];

  for (const { month, days } of MONTHS) {
    for (let day = 1; day <= days; day++) {
      const date = isoDay(YEAR, month, day);
      const { rush, festive } = dayOf(month, day);
      const base = ROWS_BY_WEEKDAY[weekdayOf(YEAR, month, day)];
      const count = Math.max(2, Math.round(base * rush * (0.85 + 0.3 * random.next())));

      const dayRows: ShopSalesRow[] = [];
      // Two rows of one day that say exactly the same thing would read as a
      // repeated row in the File check, so a repeat is drawn again.
      const seen = new Set<string>();
      for (let n = 0; n < count; n++) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const item = random.weighted(ITEMS, (it) => it.weight * (1 + (it.festive - 1) * festive));
          const roll = random.next();
          const wanted = roll < 0.55 ? 1 : roll < 0.85 ? 2 : roll < 0.95 ? 3 : random.int(4, 6);
          const qty = Math.min(wanted, item.maxQty);
          const amount = item.price * qty;
          const payment = paymentFor(amount, random.next());
          const key = `${item.name}|${qty}|${payment}`;
          if (seen.has(key)) continue;
          seen.add(key);
          dayRows.push({
            Date: date,
            Item: item.name,
            Category: item.category,
            Amount: `₹${amount}`,
            Qty: qty,
            Payment: payment,
          });
          break;
        }
      }

      for (const extra of EXTRA_ROWS) {
        if (extra.Date === date) dayRows.splice(Math.floor(dayRows.length / 2), 0, extra);
      }
      rows.push(...dayRows);
    }
  }
  return rows;
}
