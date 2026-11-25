import { seededRandom, type Random } from './random';

// "School fees": the monthly fee register of a small school, Class 1 to
// Class 8, five students in each, June to November 2026 (240 rows). Made in
// code from a fixed seed, so every phone gets the same rows.
//
// What a person can find in it:
// - fees rise class by class, so Class 8 brings in the most;
// - most families pay in full every month;
// - a few pay part of the fee most months;
// - two families stopped paying after August;
// - November is not over, so more of it is still due than any other month.
// Due is always Fee minus Paid for that month.
//
// Checked through the shared engine: the File check finds nothing. The fees
// are spread widely enough that a month with nothing paid does not count as
// an unusual value.

export const SCHOOL_FEES_COLUMNS = ['Student', 'Class', 'Month', 'Fee', 'Paid', 'Due'];

export type SchoolFeesRow = {
  Student: string;
  Class: string;
  Month: string;
  Fee: string;
  Paid: string;
  Due: string;
};

// How a family pays.
// onTime: in full every month (November may still be open).
// late: in full, but some months are still open.
// partial: part of the fee most months.
// stopped: in full until August, nothing since.
type Habit = 'onTime' | 'late' | 'partial' | 'stopped';

const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November'];
const SEED = 20260601;

// The fee for one month, by class.
const MONTHLY_FEE = [1200, 1400, 1600, 1800, 2000, 2300, 2600, 3000];

// Five students a class, Class 1 first.
const STUDENTS = [
  'Aarav Sharma', 'Ananya Verma', 'Vihaan Gupta', 'Diya Patel', 'Arjun Singh',
  'Saanvi Reddy', 'Ishaan Kumar', 'Myra Iyer', 'Kabir Khan', 'Aadhya Nair',
  'Reyansh Joshi', 'Kiara Mehta', 'Ayaan Shaikh', 'Anika Das', 'Vivaan Yadav',
  'Pari Chauhan', 'Rohan Mishra', 'Siya Agarwal', 'Krishna Pillai', 'Navya Bose',
  'Aditya Rao', 'Meera Kulkarni', 'Arnav Jain', 'Riya Sinha', 'Dhruv Thakur',
  'Tara Menon', 'Yash Pandey', 'Ira Banerjee', 'Shaurya Malhotra', 'Avni Desai',
  'Atharv Patil', 'Zoya Ansari', 'Laksh Tiwari', 'Prisha Ghosh', 'Advik Saxena',
  'Kavya Hegde', 'Rudra Chawla', 'Aarohi Bhatt', 'Om Dubey', 'Sara Fernandes',
];
const PER_CLASS = 5;

// The families that do not simply pay on time, by their place in STUDENTS.
const HABITS: Partial<Record<number, Habit>> = {
  3: 'late',
  8: 'partial',
  11: 'stopped',
  14: 'late',
  19: 'partial',
  22: 'late',
  27: 'partial',
  30: 'late',
  33: 'stopped',
  37: 'late',
};

// A part payment is a round amount (a multiple of 100), at least 500 and
// less than the fee.
function partOf(fee: number, share: number): number {
  return Math.min(fee - 100, Math.max(500, Math.round((fee * share) / 100) * 100));
}

function paidFor(habit: Habit, fee: number, month: number, random: Random): number {
  const last = month === MONTHS.length - 1;
  switch (habit) {
    case 'onTime':
      return last && random.chance(0.15) ? 0 : fee;
    case 'late':
      if (last) return random.chance(0.6) ? 0 : fee;
      return month >= 3 && random.chance(0.3) ? 0 : fee;
    case 'partial':
      if (last && random.chance(0.5)) return 0;
      return random.chance(0.2) ? fee : partOf(fee, 0.45 + 0.3 * random.next());
    case 'stopped':
      return month <= 2 ? fee : 0;
  }
}

export function schoolFeesRows(): SchoolFeesRow[] {
  const random = seededRandom(SEED);
  const rows: SchoolFeesRow[] = [];
  MONTHS.forEach((month, monthIndex) => {
    STUDENTS.forEach((student, index) => {
      const classIndex = Math.floor(index / PER_CLASS);
      const fee = MONTHLY_FEE[classIndex];
      const paid = paidFor(HABITS[index] ?? 'onTime', fee, monthIndex, random);
      rows.push({
        Student: student,
        Class: `Class ${classIndex + 1}`,
        Month: month,
        Fee: `₹${fee}`,
        Paid: `₹${paid}`,
        Due: `₹${fee - paid}`,
      });
    });
  });
  return rows;
}
