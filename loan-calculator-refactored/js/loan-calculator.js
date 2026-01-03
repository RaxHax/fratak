/**
 * Loan Calculator Core Module
 * Handles all loan amortization calculations for Icelandic mortgages
 */

class LoanCalculator {
    /**
     * Calculate loan amortization schedule
     * @param {Object} config - Loan configuration
     * @returns {Object} Schedule and summary
     */
    static calculateSchedule(config) {
        const {
            loanAmount,
            annualInterestRate,
            annualInflationRate = 0,
            loanTermYears,
            monthlyFee = 0,
            loanType = 'indexedAnnuity', // 'indexedAnnuity', 'nonIndexedAnnuity', 'nonIndexedEqualPrincipal'
            extraPayment = 0,
            indexExtraPayment = false,
            fixedPayment = 0,
            rentalIncome = null, // Optional: { grossRent, taxRate, vacancyRate, operatingCosts, indexed, applyToLoan }
            startDate = new Date(),
            acceleratedPayoff = false // If true, keep legacy behavior where extras shorten the term
        } = config;

        if (loanAmount <= 0) return null;

        const isIndexed = loanType === 'indexedAnnuity';
        const isEqualPrincipal = loanType === 'nonIndexedEqualPrincipal';
        
        // Monthly rates
        const monthlyInterestRate = annualInterestRate / 12;
        const monthlyInflationRate = isIndexed ? Math.pow(1 + annualInflationRate, 1/12) - 1 : 0;
        const totalMonths = loanTermYears * 12;

        // Calculate base payment
        // For indexed loans: use real interest rate (the rate before inflation adjustment)
        // The payment grows with inflation, so we calculate on real terms
        let basePayment;
        if (isEqualPrincipal) {
            // Equal principal: fixed principal each month + variable interest
            basePayment = loanAmount / totalMonths;
        } else {
            // Annuity payment formula
            // For indexed: payment calculated on nominal rate, but balance also grows
            if (monthlyInterestRate === 0) {
                basePayment = loanAmount / totalMonths;
            } else {
                basePayment = loanAmount * 
                    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths)) /
                    (Math.pow(1 + monthlyInterestRate, totalMonths) - 1);
            }
        }

        // Initialize tracking variables
        let balance = loanAmount;
        const schedule = [];
        let totalInterest = 0;
        let totalInflation = 0;
        let totalPaidByUser = 0; // What user actually pays from pocket
        let totalPaidToLoan = 0; // Total going toward loan (including rent)
        let totalFees = 0;
        let totalRentalContribution = 0;
        const rentalDurationMonths = rentalIncome?.rentalDurationMonths ?? Infinity;

        // Setup start date
        const paymentStartDate = new Date(startDate);
        paymentStartDate.setDate(1);
        paymentStartDate.setMonth(paymentStartDate.getMonth() + 1);

        let month = 0;
        let cumulativeInflationFactor = 1;

        while ((acceleratedPayoff ? balance > 0.01 : month < totalMonths) && month < 600) { // Max 50 years safety
            month++;
            const remainingMonths = Math.max(1, totalMonths - month + 1);

            // Step 1: Apply inflation to balance (for indexed loans)
            // This happens at the start of the period
            const inflationAmount = balance * monthlyInflationRate;
            const balanceAfterInflation = balance + inflationAmount;
            totalInflation += inflationAmount;

            // Step 2: Calculate interest on the inflated balance
            const interest = balanceAfterInflation * monthlyInterestRate;
            totalInterest += interest;

            // Step 3: Determine the required payment
            let requiredPayment;
            if (isEqualPrincipal) {
                if (acceleratedPayoff) {
                    // Legacy: original principal portion + current interest
                    requiredPayment = (loanAmount / totalMonths) + interest;
                } else {
                    const remainingPrincipalPortion = balanceAfterInflation / remainingMonths;
                    requiredPayment = remainingPrincipalPortion + interest;
                }
            } else if (isIndexed) {
                if (acceleratedPayoff) {
                    // Legacy: base payment grows with cumulative inflation
                    requiredPayment = basePayment * cumulativeInflationFactor;
                } else {
                    const realBalance = balanceAfterInflation / cumulativeInflationFactor;
                    const remainingRealPayment = LoanCalculator.calculateAnnuityPayment(
                        realBalance,
                        monthlyInterestRate,
                        remainingMonths
                    );
                    requiredPayment = remainingRealPayment * cumulativeInflationFactor;
                }
            } else {
                if (acceleratedPayoff) {
                    // Legacy: fixed payment
                    requiredPayment = basePayment;
                } else {
                    requiredPayment = LoanCalculator.calculateAnnuityPayment(
                        balanceAfterInflation,
                        monthlyInterestRate,
                        remainingMonths
                    );
                }
            }

            // Step 4: Calculate extra payments (user's manual extra)
            let manualExtra = 0;
            if (extraPayment > 0) {
                manualExtra = indexExtraPayment 
                    ? extraPayment * cumulativeInflationFactor 
                    : extraPayment;
            }

            // Handle fixed payment override
            let paymentBeforeRental = requiredPayment;
            if (fixedPayment > 0 && fixedPayment > requiredPayment) {
                paymentBeforeRental = fixedPayment;
                manualExtra = 0; // Fixed payment replaces extra payment logic
            }

            // Step 5: Apply rental income if configured
            let rentalContribution = 0;
            let rentBasedExtra = 0;
            let userOutOfPocket = paymentBeforeRental + manualExtra;

            const rentalActive = rentalIncome && month <= rentalDurationMonths;

            if (rentalActive && rentalIncome.applyToLoan) {
                const netRent = this.calculateNetRent(rentalIncome, cumulativeInflationFactor);

                if (netRent >= paymentBeforeRental) {
                    // Rent covers the required payment
                    rentalContribution = paymentBeforeRental;
                    rentBasedExtra = netRent - paymentBeforeRental;
                    userOutOfPocket = manualExtra; // User only pays their extra
                } else {
                    // Rent partially covers
                    rentalContribution = netRent;
                    userOutOfPocket = (paymentBeforeRental - netRent) + manualExtra;
                }
                totalRentalContribution += rentalContribution + rentBasedExtra;
            }

            // Step 6: Calculate total payment going to loan
            const totalPaymentToLoan = paymentBeforeRental + manualExtra + rentBasedExtra;

            // Step 7: Calculate principal paid
            // Principal = Payment - Interest (capped at remaining balance)
            const principalPaid = Math.min(totalPaymentToLoan - interest, balanceAfterInflation);
            
            // Ensure principal isn't negative (can happen with very low payments)
            const actualPrincipal = Math.max(0, principalPaid);
            
            // Step 8: Update balance
            balance = balanceAfterInflation - actualPrincipal;
            if (balance < 0.01) balance = 0;

            // Step 9: Update totals
            totalPaidByUser += userOutOfPocket + monthlyFee;
            totalPaidToLoan += totalPaymentToLoan + monthlyFee;
            totalFees += monthlyFee;

            // Step 10: Calculate payment date
            const paymentDate = new Date(paymentStartDate);
            paymentDate.setMonth(paymentStartDate.getMonth() + month - 1);

            // Step 11: Record schedule entry
            schedule.push({
                month,
                date: new Date(paymentDate),
                balanceStart: balance + actualPrincipal, // Balance before this payment
                inflation: inflationAmount,
                interest,
                principal: actualPrincipal,
                fee: monthlyFee,
                requiredPayment,
                manualExtra,
                rentBasedExtra,
                rentalContribution,
                totalPaymentToLoan: totalPaymentToLoan + monthlyFee,
                userOutOfPocket: userOutOfPocket + monthlyFee,
                balance
            });

            // Update inflation factor for next month
            cumulativeInflationFactor *= (1 + monthlyInflationRate);
        }

        return {
            schedule,
            summary: {
                originalLoan: loanAmount,
                loanType,
                termMonths: month,
                termYears: month / 12,
                totalPaidByUser,
                totalPaidToLoan,
                totalInterest,
                totalInflation,
                totalFees,
                totalRentalContribution,
                firstPayment: schedule[0]?.totalPaymentToLoan || 0,
                firstUserPayment: schedule[0]?.userOutOfPocket || 0,
                lastPayment: schedule[schedule.length - 1]?.totalPaymentToLoan || 0,
                averageMonthlyPayment: totalPaidToLoan / month
            }
        };
    }

    /**
     * Calculate net rental income
     * @param {Object} rental - Rental configuration
     * @param {number} inflationFactor - Cumulative inflation factor
     * @returns {number} Net monthly rental income
     */
    static calculateNetRent(rental, inflationFactor = 1) {
        const {
            grossRent,
            taxRate = 0.11,
            vacancyRate = 0.05,
            operatingCosts = 0,
            indexed = true,
            indexCosts = true // Whether operating costs also increase with inflation
        } = rental;

        const adjustedGrossRent = indexed ? grossRent * inflationFactor : grossRent;
        const adjustedCosts = indexCosts ? operatingCosts * inflationFactor : operatingCosts;

        const taxAmount = adjustedGrossRent * taxRate;
        const vacancyLoss = adjustedGrossRent * vacancyRate;
        
        return Math.max(0, adjustedGrossRent - taxAmount - vacancyLoss - adjustedCosts);
    }

    /**
     * Compare multiple loan scenarios
     * @param {Object} baseConfig - Base loan configuration
     * @param {Array} scenarios - Array of scenario modifications
     * @returns {Object} Comparison results
     */
    static compareScenarios(baseConfig, scenarios = []) {
        const results = {
            base: this.calculateSchedule(baseConfig)
        };

        scenarios.forEach((scenario, index) => {
            const config = { ...baseConfig, ...scenario.modifications };
            results[scenario.name || `scenario_${index}`] = this.calculateSchedule(config);
        });

        return results;
    }

    /**
     * Calculate investment metrics
     * @param {Object} config - Investment configuration
     * @returns {Object} Investment metrics
     */
    static calculateInvestmentMetrics(config) {
        const {
            propertyPrice,
            downPaymentPercent,
            loanFee,
            schedule,
            holdingYears,
            appreciationRate,
            sellingCostRate,
            rentalIncome = null
        } = config;

        if (!schedule) return null;

        const downPayment = propertyPrice * (downPaymentPercent / 100);
        const totalInvested = downPayment + loanFee;
        
        // Future property value
        const futureValue = propertyPrice * Math.pow(1 + appreciationRate, holdingYears);
        const sellingCosts = futureValue * sellingCostRate;

        // Get loan balance at sale time
        const monthsHeld = holdingYears * 12;
        let loanBalanceAtSale;
        if (monthsHeld >= schedule.length) {
            loanBalanceAtSale = 0; // Loan paid off
        } else {
            loanBalanceAtSale = schedule[monthsHeld - 1]?.balance || 0;
        }

        // Calculate equity at sale
        const equityAtSale = futureValue - loanBalanceAtSale - sellingCosts;
        const totalProfit = equityAtSale - totalInvested;

        // Calculate total cash invested over holding period
        let totalCashInvested = totalInvested;
        let totalCashFromRent = 0;
        const monthsToCount = Math.min(monthsHeld, schedule.length);
        
        for (let i = 0; i < monthsToCount; i++) {
            totalCashInvested += schedule[i].userOutOfPocket;
            totalCashFromRent += schedule[i].rentalContribution + schedule[i].rentBasedExtra;
        }

        // Cash-on-cash return (first year)
        const firstYearUserPayments = schedule.slice(0, 12).reduce(
            (sum, m) => sum + m.userOutOfPocket, 0
        );
        const firstYearRentalNet = rentalIncome 
            ? this.calculateNetRent(rentalIncome) * 12 
            : 0;
        const firstYearCashflow = firstYearRentalNet - firstYearUserPayments;
        const cashOnCashReturn = totalInvested > 0 
            ? (firstYearCashflow / totalInvested) * 100 
            : 0;

        // Total return on investment
        const totalROI = totalInvested > 0 
            ? ((totalProfit) / totalInvested) * 100 
            : 0;

        // Annualized ROI
        const annualizedROI = holdingYears > 0 
            ? (Math.pow(1 + totalROI / 100, 1 / holdingYears) - 1) * 100 
            : 0;

        return {
            totalInvested,
            futurePropertyValue: futureValue,
            loanBalanceAtSale,
            sellingCosts,
            equityAtSale,
            totalProfit,
            cashOnCashReturn,
            totalROI,
            annualizedROI,
            totalCashInvested,
            totalCashFromRent,
            breakdownByYear: this.calculateYearlyBreakdown(schedule, propertyPrice, appreciationRate)
        };
    }

    /**
     * Calculate yearly breakdown for timeline
     */
    static calculateYearlyBreakdown(schedule, propertyPrice, appreciationRate) {
        const years = [];
        const maxYears = Math.ceil(schedule.length / 12);

        for (let year = 0; year <= maxYears; year++) {
            const propertyValue = propertyPrice * Math.pow(1 + appreciationRate, year);
            const monthIndex = year * 12 - 1;
            
            let balance;
            if (year === 0) {
                balance = schedule[0]?.balanceStart || 0;
            } else if (monthIndex >= schedule.length) {
                balance = 0;
            } else {
                balance = schedule[monthIndex]?.balance || 0;
            }

            years.push({
                year,
                propertyValue,
                loanBalance: balance,
                equity: propertyValue - balance
            });
        }

        return years;
    }
}

LoanCalculator.calculateAnnuityPayment = function(principal, monthlyRate, months) {
    if (principal <= 0) return 0;
    if (monthlyRate === 0) {
        return principal / months;
    }

    const factor = Math.pow(1 + monthlyRate, months);
    return principal * (monthlyRate * factor) / (factor - 1);
};

// Export for use in browser without module system
if (typeof window !== 'undefined') {
    window.LoanCalculator = LoanCalculator;
}
