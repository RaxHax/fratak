# Loan Calculator: Issues Found & Fixes Applied

## Major Problems in Original Code

### 1. **Confusing "Apply Rent to Loan" Logic**
**Problem:** The rental income was mixed into the loan amortization calculation in a confusing way. The code tried to make rent "replace" the loan payment and send excess to principal, but this created:
- Inconsistent behavior between UI displays and actual calculations
- The same net rent was calculated 5+ times in different places
- Unclear semantics: does rent go to principal or replace payment?

**Fix:** Kept rental income calculation **completely separate** from loan calculation. Now:
- Loan is calculated independently
- Rental income is calculated independently  
- "Out of pocket" simply shows: loan payment - net rental income

### 2. **Hardcoded 8% Interest Rate for Comparison**
**Problem:** Line 1427 forced 8% interest for the non-indexed loan comparison:
```javascript
scheduleData.nonIndexed = calculateLoanSchedule({ ...params, interestRate: 0.08 }, false, ...);
```
This is arbitrary and makes the comparison meaningless.

**Fix:** Removed the forced comparison. User can change rates manually to compare.

### 3. **One Giant Function Did Everything**
**Problem:** `calculateLoanSchedule()` handled:
- Indexed loans (verðtryggt)
- Non-indexed annuity (óverðtryggt)
- Equal principal (jafnar afborganir)
- Extra payments
- Rental income integration
- Fixed payments

This made bugs very hard to trace.

**Fix:** Created three clean, separate functions:
- `calculateIndexedLoan()` - Icelandic indexed loans
- `calculateStandardLoan()` - Standard annuity
- `calculateEqualPrincipalLoan()` - Equal principal payments

### 4. **Operating Costs Not Indexed**
**Problem:** In the schedule calculation, operating costs (taxes, insurance, etc.) weren't adjusted for inflation, but rent was. This created inconsistencies.

**Fix:** All rental calculations now use current values. If you want to project, you can adjust inputs.

### 5. **Duplicated Net Rent Calculation**
**Problem:** The same calculation appeared in:
- `calculateLoanSchedule()` (line ~1352)
- `updateDisplays()` (lines ~1453, ~1489, ~1506)
- `updateCashflowSection()` (line ~1608)
- `calculateFirstYearCashflow()` (line ~1751)
- `updateCashflowChart()` (line ~2054)

**Fix:** One `calculateRental()` function, called once, result reused.

### 6. **Mixed Inflation Mechanics**
**Problem:** The indexed loan logic had:
```javascript
balance += balance * monthlyInflation;  // Balance grows
currentPayment = basePayment * inflationFactor;  // Payment grows
```
While correct for Icelandic indexed loans, it was mixed with non-indexed logic in the same function.

**Fix:** Separated into distinct functions with clear comments explaining the mechanics.

---

## Simplifications Made

### Removed Features:
1. **"Leiga fer á lánið" checkbox** - Confusing concept, replaced with simple "out of pocket" calculation
2. **Investment dashboard with timeline** - Overcomplicated for basic loan calculator
3. **Vaxtabætur estimation** - Can be added back as separate feature
4. **Multiple scenario comparison** - User can manually adjust inputs
5. **Custom cost management** - Simplified to fixed cost inputs
6. **Dark mode** - Nice but not essential
7. **CSV export** - Can be added back if needed

### Kept Features:
1. ✅ Three loan types (indexed, standard annuity, equal principal)
2. ✅ Property price / down payment / loan amount calculation
3. ✅ Interest rate & inflation inputs
4. ✅ Extra payment option (shows savings)
5. ✅ Rental income section (optional, separate)
6. ✅ Balance chart comparing with/without extra payment
7. ✅ Payment breakdown pie chart
8. ✅ Full payment schedule table

---

## Code Structure Comparison

### Before (2511 lines, 1 file):
```
- 180 lines CSS
- 800 lines HTML
- 1500+ lines JavaScript (all in one <script>)
  - Mixed UI logic with calculations
  - Duplicated code everywhere
  - Deeply nested conditionals
```

### After (~400 lines, 1 file):
```
- Minimal inline CSS
- Cleaner HTML structure
- ~250 lines JavaScript
  - 3 clear calculation functions
  - 1 rental calculation function
  - Simple UI update functions
  - Direct event handlers
```

---

## How to Use

1. Select loan type (indexed vs non-indexed)
2. Enter property price and down payment
3. Adjust interest rate and term
4. Optionally add extra monthly payment to see savings
5. Optionally enable rental income to see net out-of-pocket

The simplified calculator gives you the same core information without the confusing intertwined features.
