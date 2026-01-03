/**
 * LOAN CALCULATIONS MODULE
 * Pure functions for loan amortization - no UI dependencies
 */

// ============ UTILITY FUNCTIONS ============
function formatISK(num, showCurrency = true) {
    const rounded = Math.round(num);
    const formatted = rounded.toLocaleString('is-IS');
    return showCurrency ? `${formatted} kr.` : formatted;
}

function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// ============ INDEXED LOAN (Verðtryggt) ============
/**
 * Icelandic indexed loan: principal grows with CPI, payments grow proportionally
 * @param {number} principal - Initial loan amount
 * @param {number} annualRate - Annual interest rate (e.g., 0.0445 for 4.45%)
 * @param {number} annualInflation - Annual inflation rate (e.g., 0.04 for 4%)
 * @param {number} years - Loan term in years
 * @param {number} extraPayment - Optional extra payment per month
 * @param {number} paymentFee - Monthly fee per payment
 * @returns {Object} Schedule and summary
 */
function calculateIndexedLoan(principal, annualRate, annualInflation, years, extraPayment = 0, paymentFee = 0) {
    if (principal <= 0 || years <= 0) return null;
    
    const monthlyRate = annualRate / 12;
    const monthlyInflation = Math.pow(1 + annualInflation, 1/12) - 1;
    const totalMonths = years * 12;
    
    // Base annuity payment (calculated on original principal)
    const basePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
                        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    let balance = principal;
    let schedule = [];
    let totalInterest = 0;
    let totalInflation = 0;
    let totalPaid = 0;
    let inflationFactor = 1;
    
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() + 1);
    
    for (let month = 1; month <= 600 && balance > 0.01; month++) {
        // 1. Apply inflation to balance (this is the key indexed loan mechanic)
        const inflationAmount = balance * monthlyInflation;
        balance += inflationAmount;
        totalInflation += inflationAmount;
        
        // 2. Calculate interest on inflated balance
        const interest = balance * monthlyRate;
        totalInterest += interest;
        
        // 3. Payment grows with cumulative inflation
        const payment = basePayment * inflationFactor + extraPayment;
        
        // 4. Principal is payment minus interest
        const principalPayment = Math.min(payment - interest, balance);
        balance -= principalPayment;
        
        totalPaid += payment + paymentFee;
        
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + month - 1);
        
        schedule.push({
            month,
            date: paymentDate,
            inflation: inflationAmount,
            interest,
            principal: principalPayment,
            payment: payment + paymentFee,
            balance: Math.max(0, balance)
        });
        
        inflationFactor *= (1 + monthlyInflation);
        
        if (balance <= 0) break;
    }
    
    return {
        schedule,
        summary: {
            originalPrincipal: principal,
            totalPaid,
            totalInterest,
            totalInflation,
            termMonths: schedule.length,
            firstPayment: schedule[0]?.payment || 0,
            lastPayment: schedule[schedule.length - 1]?.payment || 0
        }
    };
}

// ============ NON-INDEXED LOAN (Óverðtryggt - Annuity) ============
/**
 * Standard annuity loan: fixed payments over term
 * @param {number} principal - Initial loan amount
 * @param {number} annualRate - Annual interest rate
 * @param {number} years - Loan term in years
 * @param {number} extraPayment - Optional extra payment per month
 * @param {number} paymentFee - Monthly fee per payment
 * @returns {Object} Schedule and summary
 */
function calculateStandardLoan(principal, annualRate, years, extraPayment = 0, paymentFee = 0) {
    if (principal <= 0 || years <= 0) return null;
    
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;
    
    // Standard annuity formula
    const basePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
                        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    let balance = principal;
    let schedule = [];
    let totalInterest = 0;
    let totalPaid = 0;
    
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() + 1);
    
    for (let month = 1; month <= 600 && balance > 0.01; month++) {
        const interest = balance * monthlyRate;
        totalInterest += interest;
        
        const payment = basePayment + extraPayment;
        const principalPayment = Math.min(payment - interest, balance);
        balance -= principalPayment;
        
        totalPaid += payment + paymentFee;
        
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + month - 1);
        
        schedule.push({
            month,
            date: paymentDate,
            inflation: 0,
            interest,
            principal: principalPayment,
            payment: payment + paymentFee,
            balance: Math.max(0, balance)
        });
        
        if (balance <= 0) break;
    }
    
    return {
        schedule,
        summary: {
            originalPrincipal: principal,
            totalPaid,
            totalInterest,
            totalInflation: 0,
            termMonths: schedule.length,
            firstPayment: schedule[0]?.payment || 0,
            lastPayment: schedule[schedule.length - 1]?.payment || 0
        }
    };
}

// ============ EQUAL PRINCIPAL LOAN (Jafnar afborganir) ============
/**
 * Equal principal payments: principal is fixed, payments decrease over time
 * @param {number} principal - Initial loan amount
 * @param {number} annualRate - Annual interest rate
 * @param {number} years - Loan term in years
 * @param {number} paymentFee - Monthly fee per payment
 * @returns {Object} Schedule and summary
 */
function calculateEqualPrincipalLoan(principal, annualRate, years, paymentFee = 0) {
    if (principal <= 0 || years <= 0) return null;
    
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;
    const monthlyPrincipal = principal / totalMonths;
    
    let balance = principal;
    let schedule = [];
    let totalInterest = 0;
    let totalPaid = 0;
    
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() + 1);
    
    for (let month = 1; month <= totalMonths && balance > 0.01; month++) {
        const interest = balance * monthlyRate;
        totalInterest += interest;
        
        const principalPayment = Math.min(monthlyPrincipal, balance);
        const payment = principalPayment + interest;
        balance -= principalPayment;
        
        totalPaid += payment + paymentFee;
        
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + month - 1);
        
        schedule.push({
            month,
            date: paymentDate,
            inflation: 0,
            interest,
            principal: principalPayment,
            payment: payment + paymentFee,
            balance: Math.max(0, balance)
        });
    }
    
    return {
        schedule,
        summary: {
            originalPrincipal: principal,
            totalPaid,
            totalInterest,
            totalInflation: 0,
            termMonths: schedule.length,
            firstPayment: schedule[0]?.payment || 0,
            lastPayment: schedule[schedule.length - 1]?.payment || 0
        }
    };
}

// ============ RENTAL INCOME CALCULATION ============
/**
 * Calculate net rental income (completely separate from loan)
 * @param {Object} params - Rental parameters
 * @returns {Object} Monthly and annual rental analysis
 */
function calculateRentalIncome(params) {
    const {
        monthlyRent,
        taxRate = 0.11,           // 11% fjármagnstekjuskattur
        vacancyRate = 0.05,       // 5% assumed vacancy
        propertyTax = 0,
        insurance = 0,
        maintenance = 0,
        hoaFees = 0,
        otherCosts = 0
    } = params;
    
    const grossRent = monthlyRent;
    const taxAmount = grossRent * taxRate;
    const vacancyLoss = grossRent * vacancyRate;
    const totalOperatingCosts = propertyTax + insurance + maintenance + hoaFees + otherCosts;
    const netRent = grossRent - taxAmount - vacancyLoss - totalOperatingCosts;
    
    return {
        monthly: {
            gross: grossRent,
            tax: taxAmount,
            vacancyLoss,
            operatingCosts: totalOperatingCosts,
            net: netRent
        },
        annual: {
            gross: grossRent * 12,
            tax: taxAmount * 12,
            vacancyLoss: vacancyLoss * 12,
            operatingCosts: totalOperatingCosts * 12,
            net: netRent * 12
        }
    };
}

// ============ CASHFLOW ANALYSIS ============
/**
 * Simple cashflow: what does the user actually pay out of pocket?
 * @param {number} loanPayment - Monthly loan payment
 * @param {number} netRentalIncome - Net rental income (after tax/costs)
 * @returns {Object} Cashflow analysis
 */
function calculateCashflow(loanPayment, netRentalIncome = 0) {
    const monthlyCashflow = netRentalIncome - loanPayment;
    
    return {
        monthlyLoanPayment: loanPayment,
        monthlyRentalIncome: netRentalIncome,
        monthlyCashflow,
        annualCashflow: monthlyCashflow * 12,
        outOfPocket: monthlyCashflow < 0 ? Math.abs(monthlyCashflow) : 0,
        surplus: monthlyCashflow > 0 ? monthlyCashflow : 0,
        isPositive: monthlyCashflow >= 0
    };
}

// ============ INVESTMENT METRICS ============
/**
 * Calculate investment returns over holding period
 * @param {Object} params - Investment parameters
 * @returns {Object} Investment metrics
 */
function calculateInvestmentMetrics(params) {
    const {
        propertyPrice,
        downPayment,
        loanBalance,           // Remaining loan balance at sale
        appreciationRate,
        holdingYears,
        sellingCostRate = 0.025,
        totalCashInvested      // Down payment + fees + any negative cashflow
    } = params;
    
    const futureValue = propertyPrice * Math.pow(1 + appreciationRate, holdingYears);
    const sellingCosts = futureValue * sellingCostRate;
    const netProceeds = futureValue - loanBalance - sellingCosts;
    const totalProfit = netProceeds - downPayment;
    
    // Simple ROI
    const roi = downPayment > 0 ? (totalProfit / downPayment) * 100 : 0;
    const annualizedROI = downPayment > 0 ? 
        (Math.pow(netProceeds / downPayment, 1 / holdingYears) - 1) * 100 : 0;
    
    return {
        purchasePrice: propertyPrice,
        futureValue,
        sellingCosts,
        remainingLoan: loanBalance,
        netProceeds,
        totalProfit,
        roi,
        annualizedROI,
        equityAtSale: netProceeds
    };
}

// ============ VAXTABÆTUR (Icelandic Interest Benefits) ============
/**
 * Estimate Icelandic vaxtabætur (interest rebate)
 * Note: This is an approximation - actual rules may vary
 * @param {Object} params - Household parameters
 * @returns {number} Estimated annual benefit
 */
function estimateVaxtabaetur(params) {
    const {
        annualInterestPaid,
        annualIncome,
        householdType = 'single',  // 'single', 'couple', 'singleParent'
        numChildren = 0
    } = params;
    
    // Base thresholds (approximate 2024 values)
    let incomeThreshold = householdType === 'single' ? 5500000 : 8000000;
    incomeThreshold += numChildren * 500000;
    
    // Maximum benefit
    let maxBenefit = householdType === 'single' ? 500000 : 600000;
    maxBenefit += numChildren * 50000;
    
    // Base benefit is 30% of interest, capped at max
    let benefit = Math.min(annualInterestPaid * 0.30, maxBenefit);
    
    // Reduce by 4% of income over threshold
    if (annualIncome > incomeThreshold) {
        const reduction = (annualIncome - incomeThreshold) * 0.04;
        benefit = Math.max(0, benefit - reduction);
    }
    
    return Math.round(benefit);
}
