/**
 * Utility Functions Module
 * Common formatting and helper functions
 */

const Utils = {
    /**
     * Format number as Icelandic currency
     * @param {number} num - Number to format
     * @param {boolean} showCurrency - Whether to show "kr." suffix
     * @returns {string} Formatted string
     */
    formatISK(num, showCurrency = true) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        const rounded = Math.round(num);
        const formatted = rounded.toLocaleString('is-IS');
        return showCurrency ? `${formatted} kr.` : formatted;
    },

    /**
     * Format number in compact form (e.g., 1.5M, 500k)
     * @param {number} num - Number to format
     * @returns {string} Compact formatted string
     */
    formatCompact(num) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}k`;
        return num.toFixed(0);
    },

    /**
     * Format percentage
     * @param {number} num - Number to format (as decimal or whole)
     * @param {number} decimals - Decimal places
     * @param {boolean} isDecimal - Whether input is already decimal (0.05 vs 5)
     * @returns {string} Formatted percentage string
     */
    formatPercent(num, decimals = 1, isDecimal = true) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        const value = isDecimal ? num * 100 : num;
        return `${value.toFixed(decimals)}%`;
    },

    /**
     * Format date in Icelandic format (DD.MM.YYYY)
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    },

    /**
     * Format duration in years and months
     * @param {number} months - Total months
     * @returns {string} Formatted duration
     */
    formatDuration(months) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        if (years === 0) return `${remainingMonths} mÃ¡n.`;
        if (remainingMonths === 0) return `${years} Ã¡r`;
        return `${years} Ã¡r ${remainingMonths} mÃ¡n.`;
    },

    /**
     * Parse formatted ISK string to number
     * @param {string} str - Formatted string (e.g., "1.234.567")
     * @returns {number} Parsed number
     */
    parseISK(str) {
        if (!str) return 0;
        // Remove all non-digit characters except minus
        const cleaned = str.toString().replace(/[^\d-]/g, '');
        return parseInt(cleaned, 10) || 0;
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 150) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Get element by ID (shorthand)
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    getEl(id) {
        return document.getElementById(id);
    },

    /**
     * Safely get nested object property
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-notation path (e.g., "a.b.c")
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Value at path or default
     */
    getNestedValue(obj, path, defaultValue = null) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : defaultValue;
        }, obj);
    },

    /**
     * Generate CSV from schedule data
     * @param {Array} schedule - Loan schedule array
     * @param {Object} options - CSV options
     * @returns {string} CSV content
     */
    generateCSV(schedule, options = {}) {
        const {
            headers = ['MÃ¡nuÃ°ur', 'Gjalddagi', 'VerÃ°bÃ¦tur', 'Afborgun', 'Vextir', 'KostnaÃ°ur', 'HeildargreiÃ°sla', 'EftirstÃ¶Ã°var'],
            delimiter = ';',
            includeUserPayment = false
        } = options;

        const allHeaders = includeUserPayment 
            ? [...headers, 'Notandi borgar']
            : headers;

        const rows = schedule.map(row => {
            const baseRow = [
                row.month,
                this.formatDate(row.date),
                Math.round(row.inflation),
                Math.round(row.principal),
                Math.round(row.interest),
                Math.round(row.fee),
                Math.round(row.totalPaymentToLoan),
                Math.round(row.balance)
            ];
            
            if (includeUserPayment) {
                baseRow.push(Math.round(row.userOutOfPocket));
            }
            
            return baseRow;
        });

        const csvContent = [allHeaders, ...rows]
            .map(row => row.join(delimiter))
            .join('\n');

        return '\ufeff' + csvContent; // BOM for Excel compatibility
    },

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Local storage helpers
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        }
    },

    /**
     * Validate loan parameters
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    validateLoanParams(params) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!params.propertyPrice || params.propertyPrice <= 0) {
            errors.push('KaupverÃ° eignar verÃ°ur aÃ° vera stÃ¦rra en 0');
        }
        if (!params.loanAmount || params.loanAmount <= 0) {
            errors.push('LÃ¡nsfjÃ¡rhÃ¦Ã° verÃ°ur aÃ° vera stÃ¦rri en 0');
        }
        if (!params.annualInterestRate || params.annualInterestRate <= 0) {
            errors.push('Vextir verÃ°a aÃ° vera stÃ¦rri en 0');
        }
        if (!params.loanTermYears || params.loanTermYears <= 0) {
            errors.push('LÃ¡nstÃ­mi verÃ°ur aÃ° vera stÃ¦rri en 0');
        }

        // Warnings
        if (params.annualInterestRate > 0.20) {
            warnings.push('Vextir eru Ã³venju hÃ¡ir (>20%)');
        }
        if (params.loanTermYears > 40) {
            warnings.push('LÃ¡nstÃ­mi er Ã³venju langur (>40 Ã¡r)');
        }
        if (params.downPaymentPercent < 10) {
            warnings.push('Ãštborgun er undir 10% - gÃ¦ti Ã¾urft sÃ©rstakt samÃ¾ykki');
        }
        if (params.loanAmount > params.propertyPrice * 0.95) {
            warnings.push('LÃ¡nshlutfall (LTV) er yfir 95%');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
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
/**
 * Rental Income Calculator Module
 * Handles rental income calculations and cashflow analysis
 */

class RentalCalculator {
    /**
     * Calculate detailed rental income breakdown
     * @param {Object} config - Rental configuration
     * @returns {Object} Rental income breakdown
     */
    static calculateMonthlyBreakdown(config) {
        const {
            grossRent,
            taxRate = 0.11,
            vacancyRate = 0.05,
            propertyTax = 0,
            insurance = 0,
            maintenance = 0,
            hoaFees = 0,
            customCosts = [],
            indexed = true,
            inflationFactor = 1
        } = config;

        // Apply inflation if indexed
        const adjustedGrossRent = indexed ? grossRent * inflationFactor : grossRent;

        // Calculate deductions (on gross rent)
        const taxAmount = adjustedGrossRent * taxRate;
        const vacancyLoss = adjustedGrossRent * vacancyRate;

        // Operating costs (may or may not be indexed)
        const baseOperatingCosts = propertyTax + insurance + maintenance + hoaFees +
            customCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
        const adjustedOperatingCosts = indexed ? baseOperatingCosts * inflationFactor : baseOperatingCosts;

        const netRent = Math.max(0, adjustedGrossRent - taxAmount - vacancyLoss - adjustedOperatingCosts);

        return {
            grossRent: adjustedGrossRent,
            deductions: {
                tax: taxAmount,
                vacancy: vacancyLoss,
                operating: adjustedOperatingCosts
            },
            operatingBreakdown: {
                propertyTax: indexed ? propertyTax * inflationFactor : propertyTax,
                insurance: indexed ? insurance * inflationFactor : insurance,
                maintenance: indexed ? maintenance * inflationFactor : maintenance,
                hoaFees: indexed ? hoaFees * inflationFactor : hoaFees,
                custom: customCosts.map(c => ({
                    name: c.name,
                    amount: indexed ? c.amount * inflationFactor : c.amount
                }))
            },
            totalDeductions: taxAmount + vacancyLoss + adjustedOperatingCosts,
            netRent
        };
    }

    /**
     * Calculate cashflow analysis
     * @param {Object} config - Cashflow configuration
     * @returns {Object} Cashflow analysis
     */
    static calculateCashflow(config) {
        const {
            rentalConfig,
            loanPayment,
            applyRentToLoan = false
        } = config;

        const rental = this.calculateMonthlyBreakdown(rentalConfig);
        const netRent = rental.netRent;

        let result = {
            rental,
            loanPayment,
            applyRentToLoan
        };

        if (applyRentToLoan) {
            // Rent goes toward loan payment
            if (netRent >= loanPayment) {
                result.rentCoversLoan = true;
                result.surplusTowardsPrincipal = netRent - loanPayment;
                result.userOutOfPocket = 0;
                result.monthlyBenefit = netRent - loanPayment;
            } else {
                result.rentCoversLoan = false;
                result.surplusTowardsPrincipal = 0;
                result.userOutOfPocket = loanPayment - netRent;
                result.monthlyBenefit = -(loanPayment - netRent);
            }
        } else {
            // Rent and loan are separate
            result.rentCoversLoan = netRent >= loanPayment;
            result.surplusTowardsPrincipal = 0;
            result.userOutOfPocket = loanPayment;
            result.monthlyBenefit = netRent - loanPayment;
        }

        result.annualBenefit = result.monthlyBenefit * 12;

        return result;
    }

    /**
     * Calculate break-even rent
     * @param {Object} config - Configuration
     * @returns {number} Break-even gross rent
     */
    static calculateBreakEvenRent(config) {
        const {
            loanPayment,
            taxRate = 0.11,
            vacancyRate = 0.05,
            operatingCosts = 0
        } = config;

        // Solve for gross rent where net rent = loan payment
        // netRent = grossRent - (grossRent * taxRate) - (grossRent * vacancyRate) - operatingCosts
        // netRent = grossRent * (1 - taxRate - vacancyRate) - operatingCosts
        // loanPayment = grossRent * (1 - taxRate - vacancyRate) - operatingCosts
        // grossRent = (loanPayment + operatingCosts) / (1 - taxRate - vacancyRate)

        const effectiveRate = 1 - taxRate - vacancyRate;
        if (effectiveRate <= 0) return Infinity;

        return (loanPayment + operatingCosts) / effectiveRate;
    }

    /**
     * Calculate cap rate
     * @param {Object} config - Configuration
     * @returns {number} Cap rate as decimal
     */
    static calculateCapRate(config) {
        const {
            annualNetOperatingIncome,
            propertyValue
        } = config;

        if (propertyValue <= 0) return 0;
        return annualNetOperatingIncome / propertyValue;
    }

    /**
     * Calculate gross rent multiplier
     * @param {number} propertyPrice - Property price
     * @param {number} annualGrossRent - Annual gross rent
     * @returns {number} GRM
     */
    static calculateGRM(propertyPrice, annualGrossRent) {
        if (annualGrossRent <= 0) return Infinity;
        return propertyPrice / annualGrossRent;
    }

    /**
     * Generate multi-year rental projection
     * @param {Object} config - Configuration
     * @param {number} years - Number of years to project
     * @returns {Array} Yearly projections
     */
    static projectRentalIncome(config, years) {
        const {
            baseRentalConfig,
            annualRentIncrease = 0.03, // 3% default annual increase
            annualCostIncrease = 0.02  // 2% default annual cost increase
        } = config;

        const projections = [];

        for (let year = 1; year <= years; year++) {
            const rentFactor = Math.pow(1 + annualRentIncrease, year - 1);
            const costFactor = Math.pow(1 + annualCostIncrease, year - 1);

            const yearConfig = {
                ...baseRentalConfig,
                grossRent: baseRentalConfig.grossRent * rentFactor,
                propertyTax: (baseRentalConfig.propertyTax || 0) * costFactor,
                insurance: (baseRentalConfig.insurance || 0) * costFactor,
                maintenance: (baseRentalConfig.maintenance || 0) * costFactor,
                hoaFees: (baseRentalConfig.hoaFees || 0) * costFactor,
                customCosts: (baseRentalConfig.customCosts || []).map(c => ({
                    ...c,
                    amount: c.amount * costFactor
                }))
            };

            const breakdown = this.calculateMonthlyBreakdown(yearConfig);
            
            projections.push({
                year,
                monthlyGross: breakdown.grossRent,
                monthlyNet: breakdown.netRent,
                annualGross: breakdown.grossRent * 12,
                annualNet: breakdown.netRent * 12
            });
        }

        return projections;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.RentalCalculator = RentalCalculator;
}
/**
 * UI State Management Module
 * Handles form inputs, state, and reactivity
 */

class UIState {
    constructor() {
        this.state = {};
        this.listeners = new Map();
        this.inputMappings = new Map();
    }

    /**
     * Initialize state from DOM elements
     * @param {Object} config - Configuration mapping element IDs to state keys
     */
    init(config) {
        Object.entries(config).forEach(([key, elementConfig]) => {
            const { elementId, type = 'number', defaultValue, parser, slider } = elementConfig;
            const element = document.getElementById(elementId);
            
            if (!element) {
                console.warn(`Element not found: ${elementId}`);
                return;
            }

            this.inputMappings.set(key, { element, type, parser, slider });

            // Get initial value
            let value = this.getElementValue(element, type, parser);
            if (value === null || value === undefined) {
                value = defaultValue;
            }
            
            this.state[key] = value;

            // Setup event listeners
            element.addEventListener('input', () => this.handleInput(key));
            element.addEventListener('change', () => this.handleInput(key));

            // Setup slider sync if provided
            if (slider) {
                const sliderEl = document.getElementById(slider);
                if (sliderEl) {
                    sliderEl.addEventListener('input', () => {
                        element.value = sliderEl.value;
                        this.handleInput(key);
                    });
                }
            }
        });
    }

    /**
     * Get value from element based on type
     */
    getElementValue(element, type, parser) {
        if (parser) return parser(element.value);
        
        switch (type) {
            case 'number':
                return parseFloat(element.value) || 0;
            case 'integer':
                return parseInt(element.value, 10) || 0;
            case 'checkbox':
                return element.checked;
            case 'select':
            case 'text':
                return element.value;
            case 'percent':
                return (parseFloat(element.value) || 0) / 100;
            case 'formatted-number':
                return parseInt(element.value.replace(/\D/g, ''), 10) || 0;
            default:
                return element.value;
        }
    }

    /**
     * Handle input change
     */
    handleInput(key) {
        const mapping = this.inputMappings.get(key);
        if (!mapping) return;

        const newValue = this.getElementValue(mapping.element, mapping.type, mapping.parser);
        const oldValue = this.state[key];
        
        if (newValue !== oldValue) {
            this.state[key] = newValue;
            this.notifyListeners(key, newValue, oldValue);
        }

        // Sync slider if exists
        if (mapping.slider) {
            const sliderEl = document.getElementById(mapping.slider);
            if (sliderEl) {
                sliderEl.value = mapping.type === 'percent' ? newValue * 100 : newValue;
            }
        }
    }

    /**
     * Set state value programmatically
     */
    set(key, value, updateDOM = true) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (updateDOM) {
            const mapping = this.inputMappings.get(key);
            if (mapping) {
                if (mapping.type === 'checkbox') {
                    mapping.element.checked = value;
                } else if (mapping.type === 'percent') {
                    mapping.element.value = value * 100;
                } else {
                    mapping.element.value = value;
                }
                
                if (mapping.slider) {
                    const sliderEl = document.getElementById(mapping.slider);
                    if (sliderEl) {
                        sliderEl.value = mapping.type === 'percent' ? value * 100 : value;
                    }
                }
            }
        }
        
        if (value !== oldValue) {
            this.notifyListeners(key, value, oldValue);
        }
    }

    /**
     * Get state value
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Get all state
     */
    getAll() {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     * @param {string|string[]} keys - Key(s) to listen to ('*' for all)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(keys, callback) {
        const keyList = Array.isArray(keys) ? keys : [keys];
        
        keyList.forEach(key => {
            if (!this.listeners.has(key)) {
                this.listeners.set(key, new Set());
            }
            this.listeners.get(key).add(callback);
        });

        // Return unsubscribe function
        return () => {
            keyList.forEach(key => {
                this.listeners.get(key)?.delete(callback);
            });
        };
    }

    /**
     * Notify listeners of state change
     */
    notifyListeners(key, newValue, oldValue) {
        // Notify specific key listeners
        this.listeners.get(key)?.forEach(callback => {
            callback(newValue, oldValue, key);
        });
        
        // Notify wildcard listeners
        this.listeners.get('*')?.forEach(callback => {
            callback(newValue, oldValue, key);
        });
    }

    /**
     * Batch update multiple values
     */
    batchUpdate(updates, updateDOM = true) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value, updateDOM);
        });
    }

    /**
     * Reset to default values
     */
    reset(defaults) {
        Object.entries(defaults).forEach(([key, value]) => {
            this.set(key, value, true);
        });
    }

    /**
     * Export state as JSON
     */
    export() {
        return JSON.stringify(this.state);
    }

    /**
     * Import state from JSON
     */
    import(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.batchUpdate(data, true);
            return true;
        } catch (e) {
            console.error('Failed to import state:', e);
            return false;
        }
    }
}

/**
 * Scenario Manager
 * Handles saving and loading loan scenarios
 */
class ScenarioManager {
    constructor(storageKey = 'loanScenarios') {
        this.storageKey = storageKey;
        this.scenarios = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch {
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.scenarios));
            return true;
        } catch {
            return false;
        }
    }

    add(name, params) {
        this.scenarios.push({
            name,
            params,
            savedAt: new Date().toISOString()
        });
        this.save();
        return this.scenarios.length - 1;
    }

    get(index) {
        return this.scenarios[index];
    }

    getAll() {
        return [...this.scenarios];
    }

    remove(index) {
        this.scenarios.splice(index, 1);
        this.save();
    }

    update(index, name, params) {
        if (this.scenarios[index]) {
            this.scenarios[index] = {
                name,
                params,
                savedAt: new Date().toISOString()
            };
            this.save();
        }
    }

    clear() {
        this.scenarios = [];
        this.save();
    }
}

/**
 * Custom Costs Manager
 */
class CustomCostsManager {
    constructor(storageKey = 'customCosts') {
        this.storageKey = storageKey;
        this.costs = this.load();
        this.listeners = new Set();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch {
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.costs));
            this.notifyListeners();
            return true;
        } catch {
            return false;
        }
    }

    add(name, amount) {
        if (!name || amount <= 0) return false;
        this.costs.push({ name, amount });
        this.save();
        return true;
    }

    remove(index) {
        this.costs.splice(index, 1);
        this.save();
    }

    getAll() {
        return [...this.costs];
    }

    getTotal() {
        return this.costs.reduce((sum, c) => sum + (c.amount || 0), 0);
    }

    clear() {
        this.costs = [];
        this.save();
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.costs));
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.UIState = UIState;
    window.ScenarioManager = ScenarioManager;
    window.CustomCostsManager = CustomCostsManager;
}
/**
 * Charts Module
 * Handles all Chart.js visualizations
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.isDark = false;
    }

    /**
     * Update dark mode setting
     */
    setDarkMode(isDark) {
        this.isDark = isDark;
        this.updateTheme();
    }

    /**
     * Get theme colors based on mode
     */
    getThemeColors() {
        return {
            text: this.isDark ? '#94a3b8' : '#64748b',
            grid: this.isDark ? '#334155' : '#e2e8f0',
            background: this.isDark ? '#1e293b' : '#ffffff'
        };
    }

    /**
     * Update Chart.js defaults
     */
    updateTheme() {
        const colors = this.getThemeColors();
        Chart.defaults.color = colors.text;
        Chart.defaults.borderColor = colors.grid;
    }

    /**
     * Destroy existing chart if it exists
     */
    destroyChart(key) {
        if (this.charts[key]) {
            this.charts[key].destroy();
            this.charts[key] = null;
        }
    }

    /**
     * Create/update balance chart
     */
    createBalanceChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        this.destroyChart('balance');

        const { standard, accelerated, nonIndexed } = data;
        const maxMonths = Math.max(
            standard?.schedule?.length || 0,
            accelerated?.schedule?.length || 0,
            nonIndexed?.schedule?.length || 0
        );

        // Build year-by-year data
        const yearsData = [];
        const standardData = [];
        const acceleratedData = [];
        const nonIndexedData = [];

        for (let month = 0; month <= maxMonths; month += 12) {
            const year = Math.floor(month / 12);
            yearsData.push(year);

            if (month === 0) {
                standardData.push(standard?.summary?.originalLoan || null);
                acceleratedData.push(accelerated?.summary?.originalLoan || null);
                nonIndexedData.push(nonIndexed?.summary?.originalLoan || null);
            } else {
                const monthIndex = month - 1;
                standardData.push(this.getBalanceAtMonth(standard, monthIndex));
                acceleratedData.push(this.getBalanceAtMonth(accelerated, monthIndex));
                nonIndexedData.push(this.getBalanceAtMonth(nonIndexed, monthIndex));
            }
        }

        const colors = this.getThemeColors();

        this.charts.balance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearsData,
                datasets: [
                    {
                        label: 'HefÃ°bundin',
                        data: standardData,
                        borderColor: '#64748b',
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Ã“verÃ°tryggt',
                        data: nonIndexedData,
                        borderColor: '#14b8a6',
                        backgroundColor: 'rgba(20, 184, 166, 0.1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'FlÃ½tiÃ¡Ã¦tlun',
                        data: acceleratedData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 4,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: this.getLineChartOptions('Ãr', 'EftirstÃ¶Ã°var')
        });
    }

    /**
     * Helper to get balance at specific month index
     */
    getBalanceAtMonth(schedule, monthIndex) {
        if (!schedule?.schedule) return null;
        if (monthIndex >= schedule.schedule.length) return 0;
        return schedule.schedule[monthIndex]?.balance ?? null;
    }

    /**
     * Create payment breakdown chart
     */
    createPaymentBreakdownChart(canvasId, schedule) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx || !schedule?.schedule) return;

        this.destroyChart('paymentBreakdown');

        // Sample every 12 months
        const sampledData = schedule.schedule.filter((_, i) => i % 12 === 0);
        const labels = sampledData.map(r => `Ãr ${Math.ceil(r.month / 12)}`);

        this.charts.paymentBreakdown = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Afborgun',
                        data: sampledData.map(r => r.principal),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    },
                    {
                        label: 'Vextir',
                        data: sampledData.map(r => r.interest),
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    },
                    {
                        label: 'VerÃ°bÃ¦tur',
                        data: sampledData.map(r => r.inflation),
                        backgroundColor: '#f97316',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 15 }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { callback: (value) => this.formatCompact(value) }
                    }
                }
            }
        });
    }

    /**
     * Create equity chart
     */
    createEquityChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx || !data?.breakdownByYear) return;

        this.destroyChart('equity');

        const years = data.breakdownByYear;
        const labels = years.map(y => `Ãr ${y.year}`);

        this.charts.equity = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'VerÃ°mÃ¦ti eignar',
                        data: years.map(y => y.propertyValue),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981',
                        tension: 0.4
                    },
                    {
                        label: 'EftirstÃ¶Ã°var lÃ¡ns',
                        data: years.map(y => y.loanBalance),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#ef4444',
                        tension: 0.4
                    },
                    {
                        label: 'EigiÃ° fÃ©',
                        data: years.map(y => y.equity),
                        borderColor: '#8b5cf6',
                        borderWidth: 4,
                        pointRadius: 5,
                        pointBackgroundColor: '#8b5cf6',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: this.getLineChartOptions('Ãr', 'ISK')
        });
    }

    /**
     * Create cost pie chart
     */
    createCostPieChart(canvasId, summary, loanAmount, loanFee) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx || !summary) return;

        this.destroyChart('costPie');

        const data = [
            loanAmount,
            summary.totalInterest,
            summary.totalInflation,
            loanFee + summary.totalFees
        ];
        const labels = ['HÃ¶fuÃ°stÃ³ll', 'Vextir', 'VerÃ°bÃ¦tur', 'GjÃ¶ld'];
        const colors = ['#3b82f6', '#ef4444', '#f97316', '#64748b'];

        this.charts.costPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatISK(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        return { data, labels, colors };
    }

    /**
     * Create cashflow chart
     */
    createCashflowChart(canvasId, schedule, rentalConfig, applyRentToLoan = false) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx || !schedule?.schedule) return;

        this.destroyChart('cashflow');

        const years = Math.min(Math.ceil(schedule.schedule.length / 12), 30);
        const labels = Array.from({ length: years }, (_, i) => `Ãr ${i + 1}`);

        const rentalDurationMonths = rentalConfig?.rentalDurationMonths ?? Infinity;

        const rentalIncomes = [];
        const mortgagePayments = [];
        const netCashflows = [];

        for (let year = 0; year < years; year++) {
            const monthIndex = year * 12;
            const scheduleRow = schedule.schedule[monthIndex] || schedule.schedule[schedule.schedule.length - 1];

            // Calculate rental income for this year (with inflation)
            const inflationFactor = Math.pow(1 + (rentalConfig.annualInflationRate || 0.04), year);
            
            // Simplified net rent calculation for chart
            const grossRent = rentalConfig.indexed 
                ? rentalConfig.grossRent * inflationFactor 
                : rentalConfig.grossRent;
            const taxAmount = grossRent * (rentalConfig.taxRate || 0.11);
            const vacancyLoss = grossRent * (rentalConfig.vacancyRate || 0.05);
            const operatingCosts = rentalConfig.operatingCosts * (rentalConfig.indexed ? inflationFactor : 1);
            const monthlyNetRent = grossRent - taxAmount - vacancyLoss - operatingCosts;

            const activeMonths = !isFinite(rentalDurationMonths)
                ? 12
                : Math.max(0, Math.min(12, rentalDurationMonths - year * 12));
            const netRent = monthlyNetRent * activeMonths;

            const annualMortgage = scheduleRow.totalPaymentToLoan * 12;

            rentalIncomes.push(netRent);
            mortgagePayments.push(-annualMortgage);

            // Calculate net cashflow
            if (applyRentToLoan) {
                const outOfPocket = Math.max(0, annualMortgage - netRent);
                const surplus = Math.max(0, netRent - annualMortgage);
                netCashflows.push(surplus > 0 ? surplus : -outOfPocket);
            } else {
                netCashflows.push(netRent - annualMortgage);
            }
        }

        this.charts.cashflow = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'NettÃ³ leigutekjur',
                        data: rentalIncomes,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'LÃ¡nakostnaÃ°ur',
                        data: mortgagePayments,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    },
                    {
                        type: 'line',
                        label: applyRentToLoan ? 'Ãšr vasa' : 'NettÃ³ sjÃ³Ã°streymi',
                        data: netCashflows,
                        borderColor: '#8b5cf6',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#8b5cf6',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 15 }
                    }
                },
                scales: {
                    y: {
                        ticks: { callback: (value) => this.formatCompact(value) }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    /**
     * Get standard line chart options
     */
    getLineChartOptions(xLabel, yLabel) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${this.formatISK(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: (value) => this.formatCompact(value)
                    }
                },
                x: {
                    title: { display: !!xLabel, text: xLabel, font: { weight: '500' } },
                    grid: { display: false }
                }
            }
        };
    }

    /**
     * Format helpers
     */
    formatISK(num) {
        if (num === null || num === undefined) return '-';
        return Math.round(num).toLocaleString('is-IS') + ' kr.';
    }

    formatCompact(num) {
        if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}k`;
        return num.toFixed(0);
    }

    /**
     * Update all charts
     */
    updateAll(data) {
        if (data.balance) {
            this.createBalanceChart('balanceChart', data.balance);
        }
        if (data.paymentBreakdown) {
            this.createPaymentBreakdownChart('paymentBreakdownChart', data.paymentBreakdown);
        }
        if (data.equity) {
            this.createEquityChart('equityChart', data.equity);
        }
        if (data.costPie) {
            this.createCostPieChart('costPieChart', data.costPie.summary, data.costPie.loanAmount, data.costPie.loanFee);
        }
        if (data.cashflow) {
            this.createCashflowChart('cashflowChart', data.cashflow.schedule, data.cashflow.rentalConfig, data.cashflow.applyRentToLoan);
        }
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(key => this.destroyChart(key));
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}
/**
 * Main Application
 * Ties together all modules and handles the UI
 */

// Import modules (for module-based usage)
// In browser, these are available as globals

class LoanCalculatorApp {
    constructor() {
        this.scheduleData = {
            standard: null,
            accelerated: null,
            nonIndexed: null
        };
        
        this.chartManager = new ChartManager();
        this.scenarioManager = new ScenarioManager();
        this.customCostsManager = new CustomCostsManager();
        this.debounceTimer = null;
        
        this.init();
    }

    init() {
        this.initDarkMode();
        this.setupEventListeners();
        this.renderCustomCosts();
        this.renderScenarios();
        this.updateLoanAmount();
        this.calculate();
    }

    // ==================== DARK MODE ====================
    initDarkMode() {
        const storedPreference = localStorage.getItem('darkMode');
        const prefersDark = storedPreference === 'true' || storedPreference === null;

        if (prefersDark) {
            document.documentElement.classList.add('dark');
            if (storedPreference === null) {
                localStorage.setItem('darkMode', 'true');
            }
        } else {
            document.documentElement.classList.remove('dark');
        }

        this.chartManager.setDarkMode(document.documentElement.classList.contains('dark'));
    }

    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);
        this.chartManager.setDarkMode(isDark);
        this.updateCharts();
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Dark mode toggle
        Utils.getEl('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Loan type change
        Utils.getEl('loanType')?.addEventListener('change', (e) => this.handleLoanTypeChange(e));

        // Rental toggle
        Utils.getEl('enableRental')?.addEventListener('change', (e) => this.handleRentalToggle(e));

        // Setup slider synchronization
        this.setupSliderSync();

        // All input changes trigger recalculation
        this.setupInputListeners();

        // Custom costs
        Utils.getEl('addCustomCost')?.addEventListener('click', () => this.addCustomCost());

        // Scenario management
        Utils.getEl('saveScenario')?.addEventListener('click', () => this.saveScenario());

        // Export
        Utils.getEl('exportCSV')?.addEventListener('click', () => this.exportCSV());

        // Schedule view toggle
        document.querySelectorAll('input[name="scheduleView"]').forEach(radio => {
            radio.addEventListener('change', () => this.renderDetailedTable());
        });

        Utils.getEl('scheduleDisplayCount')?.addEventListener('change', () => this.renderDetailedTable());

        // Print button
        document.querySelector('[onclick="window.print()"]')?.removeAttribute('onclick');
        document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent.includes('Prenta')) {
                btn.addEventListener('click', () => window.print());
            }
        });
    }

    setupSliderSync() {
        const sliderPairs = [
            { slider: 'propertyPriceSlider', input: 'propertyPrice', formatted: 'propertyPriceFormatted' },
            { slider: 'downPaymentSlider', input: 'downPaymentPercent' },
            { slider: 'interestRateSlider', input: 'interestRate' },
            { slider: 'inflationRateSlider', input: 'inflationRate' },
            { slider: 'loanTermSlider', input: 'loanTerm' },
            { slider: 'extraPaymentSlider', input: 'extraPayment' },
            { slider: 'fixedPaymentSlider', input: 'fixedPayment' },
            { slider: 'monthlyRentSlider', input: 'monthlyRent' },
            { slider: 'rentalDurationSlider', input: 'rentalDurationYears' },
            { slider: 'appreciationSlider', input: 'appreciationRate' },
            { slider: 'holdingPeriodSlider', input: 'holdingPeriod' }
        ];

        sliderPairs.forEach(({ slider, input, formatted }) => {
            const sliderEl = Utils.getEl(slider);
            const inputEl = Utils.getEl(input);
            const formattedEl = formatted ? Utils.getEl(formatted) : null;

            if (sliderEl && inputEl) {
                sliderEl.addEventListener('input', () => {
                    inputEl.value = sliderEl.value;
                    if (formattedEl) {
                        formattedEl.value = parseInt(sliderEl.value).toLocaleString('is-IS');
                    }
                    this.updateLoanAmount();
                    this.debouncedCalculate();
                });

                inputEl.addEventListener('input', () => {
                    sliderEl.value = inputEl.value;
                    this.updateLoanAmount();
                    this.debouncedCalculate();
                });
            }
        });

        // Property price formatted input
        const propFormatted = Utils.getEl('propertyPriceFormatted');
        const propHidden = Utils.getEl('propertyPrice');
        const propSlider = Utils.getEl('propertyPriceSlider');
        
        if (propFormatted && propHidden && propSlider) {
            propFormatted.addEventListener('input', () => {
                const value = propFormatted.value.replace(/\D/g, '');
                propHidden.value = value;
                propSlider.value = value;
                propFormatted.value = value ? parseInt(value).toLocaleString('is-IS') : '';
                this.updateLoanAmount();
                this.debouncedCalculate();
            });
        }
    }

    setupInputListeners() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.debouncedCalculate());
            input.addEventListener('change', () => this.debouncedCalculate());
        });

        // Mutual exclusivity for extra payment vs fixed payment
        const extraPayment = Utils.getEl('extraPayment');
        const fixedPayment = Utils.getEl('fixedPayment');
        
        if (extraPayment && fixedPayment) {
            extraPayment.addEventListener('input', () => {
                if (parseFloat(extraPayment.value) > 0) {
                    fixedPayment.value = 0;
                    Utils.getEl('fixedPaymentSlider').value = 0;
                }
            });
            
            fixedPayment.addEventListener('input', () => {
                if (parseFloat(fixedPayment.value) > 0) {
                    extraPayment.value = 0;
                    Utils.getEl('extraPaymentSlider').value = 0;
                }
            });
        }
    }

    // ==================== TAB NAVIGATION ====================
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.classList.add('bg-white', 'dark:bg-slate-800', 'shadow');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.classList.remove('bg-white', 'dark:bg-slate-800', 'shadow');
        }

        document.querySelectorAll('[id^="tab-"]').forEach(panel => {
            panel.classList.add('hidden');
        });
        Utils.getEl(`tab-${tab}`)?.classList.remove('hidden');
    }

    // ==================== HANDLERS ====================
    handleLoanTypeChange(e) {
        const type = e.target.value;
        const inflationContainer = Utils.getEl('inflation-container');
        const interestRate = Utils.getEl('interestRate');
        const interestSlider = Utils.getEl('interestRateSlider');

        if (inflationContainer) {
            inflationContainer.style.display = type === 'indexedAnnuity' ? 'block' : 'none';
        }

        // Suggest typical rates
        if (type === 'indexedAnnuity') {
            if (interestRate) interestRate.value = 4.45;
            if (interestSlider) interestSlider.value = 4.45;
        } else {
            if (interestRate) interestRate.value = 8.0;
            if (interestSlider) interestSlider.value = 8.0;
        }

        this.debouncedCalculate();
    }

    handleRentalToggle(e) {
        const enabled = e.target.checked;
        const rentalFields = Utils.getEl('rentalFields');
        const cashflowSection = Utils.getEl('cashflowSection');
        const cashflowChart = Utils.getEl('cashflowChartContainer');

        if (rentalFields) {
            rentalFields.classList.toggle('opacity-50', !enabled);
            rentalFields.classList.toggle('pointer-events-none', !enabled);
        }
        if (cashflowSection) cashflowSection.classList.toggle('hidden', !enabled);
        if (cashflowChart) cashflowChart.classList.toggle('hidden', !enabled);

        this.debouncedCalculate();
    }

    // ==================== LOAN AMOUNT CALCULATION ====================
    updateLoanAmount() {
        const price = parseFloat(Utils.getEl('propertyPrice')?.value) || 0;
        const downPct = parseFloat(Utils.getEl('downPaymentPercent')?.value) || 0;
        const downAmount = price * (downPct / 100);
        const loanAmount = price - downAmount;
        const ltv = 100 - downPct;

        // Update displays
        const downAmountEl = Utils.getEl('downPaymentAmount');
        const loanAmountEl = Utils.getEl('loanAmount');
        const loanAmountFormattedEl = Utils.getEl('loanAmountFormatted');
        const ltvDisplay = Utils.getEl('ltvDisplay');
        const ltvBar = Utils.getEl('ltvBar');

        if (downAmountEl) downAmountEl.textContent = Utils.formatISK(downAmount, false);
        if (loanAmountEl) loanAmountEl.value = loanAmount;
        if (loanAmountFormattedEl) loanAmountFormattedEl.value = Utils.formatISK(loanAmount, false);
        if (ltvDisplay) ltvDisplay.textContent = `${ltv.toFixed(0)}%`;
        
        if (ltvBar) {
            ltvBar.style.width = `${ltv}%`;
            // Color based on LTV
            if (ltv <= 60) {
                ltvBar.className = 'h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300';
            } else if (ltv <= 80) {
                ltvBar.className = 'h-full bg-gradient-to-r from-green-500 via-yellow-400 to-yellow-500 rounded-full transition-all duration-300';
            } else {
                ltvBar.className = 'h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full transition-all duration-300';
            }
        }
    }

    // ==================== GET PARAMETERS ====================
    getParams() {
        const customCostTotal = this.customCostsManager.getTotal();

        const numberOrDefault = (value, defaultValue = 0) => {
            const parsed = parseFloat(value);
            return Number.isNaN(parsed) ? defaultValue : parsed;
        };

        const parsedLoanTerm = parseInt(Utils.getEl('loanTerm')?.value, 10);
        const loanTermYears = Number.isNaN(parsedLoanTerm) ? 30 : parsedLoanTerm;

        const rentalDurationYears = numberOrDefault(Utils.getEl('rentalDurationYears')?.value, loanTermYears);
        const rentalDurationMonths = rentalDurationYears > 0 ? rentalDurationYears * 12 : loanTermYears * 12;

        return {
            loanType: Utils.getEl('loanType')?.value || 'indexedAnnuity',
            propertyPrice: numberOrDefault(Utils.getEl('propertyPrice')?.value),
            loanAmount: parseFloat(Utils.getEl('loanAmount')?.value) || 0,
            downPaymentPercent: parseFloat(Utils.getEl('downPaymentPercent')?.value) || 0,
            loanFee: parseFloat(Utils.getEl('loanFee')?.value) || 0,
            monthlyFee: parseFloat(Utils.getEl('paymentFee')?.value) || 0,
            annualInterestRate: (parseFloat(Utils.getEl('interestRate')?.value) || 0) / 100,
            annualInflationRate: (parseFloat(Utils.getEl('inflationRate')?.value) || 0) / 100,
            loanTermYears,
            extraPayment: parseFloat(Utils.getEl('extraPayment')?.value) || 0,
            indexExtraPayment: Utils.getEl('indexExtraPayment')?.checked || false,
            fixedPayment: parseFloat(Utils.getEl('fixedPayment')?.value) || 0,

            // Rental
            rentalEnabled: Utils.getEl('enableRental')?.checked || false,
            applyRentToLoan: Utils.getEl('applyRentToLoan')?.checked || false,
            grossRent: numberOrDefault(Utils.getEl('monthlyRent')?.value),
            indexRent: Utils.getEl('indexRent')?.checked !== false,
            taxRate: numberOrDefault(Utils.getEl('incomeTaxRate')?.value, 11) / 100,
            propertyTax: numberOrDefault(Utils.getEl('propertyTax')?.value),
            insurance: numberOrDefault(Utils.getEl('insurance')?.value),
            maintenance: numberOrDefault(Utils.getEl('maintenance')?.value),
            hoaFees: numberOrDefault(Utils.getEl('hoaFees')?.value),
            customCosts: customCostTotal,
            vacancyRate: numberOrDefault(Utils.getEl('vacancyRate')?.value, 5) / 100,
            rentalDurationYears,
            rentalDurationMonths,

            // Investment
            appreciationRate: (parseFloat(Utils.getEl('appreciationRate')?.value) || 3.5) / 100,
            holdingPeriod: parseInt(Utils.getEl('holdingPeriod')?.value) || 10,
            sellingCostRate: numberOrDefault(Utils.getEl('sellingCosts')?.value, 2.5) / 100
        };
    }

    // ==================== MAIN CALCULATION ====================
    debouncedCalculate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.calculate(), 150);
    }

    calculate() {
        const params = this.getParams();
        
        // Build rental config for loan calculator
        const rentalIncome = params.rentalEnabled ? {
            grossRent: params.grossRent,
            taxRate: params.taxRate,
            vacancyRate: params.vacancyRate,
            operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts,
            indexed: params.indexRent,
            indexCosts: params.indexRent, // Costs also indexed when rent is indexed
            applyToLoan: params.applyRentToLoan,
            rentalDurationMonths: params.rentalDurationMonths
        } : null;

        // Calculate standard schedule (no extras, no rental)
        this.scheduleData.standard = LoanCalculator.calculateSchedule({
            loanAmount: params.loanAmount,
            annualInterestRate: params.annualInterestRate,
            annualInflationRate: params.annualInflationRate,
            loanTermYears: params.loanTermYears,
            monthlyFee: params.monthlyFee,
            loanType: params.loanType
        });

        // Calculate accelerated schedule (with extras and rental)
        this.scheduleData.accelerated = LoanCalculator.calculateSchedule({
            loanAmount: params.loanAmount,
            annualInterestRate: params.annualInterestRate,
            annualInflationRate: params.annualInflationRate,
            loanTermYears: params.loanTermYears,
            monthlyFee: params.monthlyFee,
            loanType: params.loanType,
            extraPayment: params.extraPayment,
            indexExtraPayment: params.indexExtraPayment,
            fixedPayment: params.fixedPayment,
            rentalIncome: rentalIncome
        });

        // Calculate non-indexed comparison (use current rate, not hardcoded)
        // Use user's rate if they selected non-indexed, otherwise use typical 8%
        const nonIndexedRate = params.loanType !== 'indexedAnnuity' 
            ? params.annualInterestRate 
            : 0.08;
        
        this.scheduleData.nonIndexed = LoanCalculator.calculateSchedule({
            loanAmount: params.loanAmount,
            annualInterestRate: nonIndexedRate,
            annualInflationRate: 0,
            loanTermYears: params.loanTermYears,
            monthlyFee: params.monthlyFee,
            loanType: 'nonIndexedAnnuity'
        });

        // Update all displays
        this.updateDisplays(params);
        this.updateCharts();
        this.renderDetailedTable();
        this.updateInvestmentDashboard(params);

        if (params.rentalEnabled) {
            this.updateCashflowSection(params);
            this.renderCostBreakdownBars(params);
        }
    }

    // ==================== UPDATE DISPLAYS ====================
    updateDisplays(params) {
        const { standard, accelerated, nonIndexed } = this.scheduleData;
        if (!standard) return;

        // Hero metrics
        Utils.getEl('heroPayment').textContent = Utils.formatISK(standard.summary.firstPayment, false);
        Utils.getEl('heroTotalCost').textContent = Utils.formatISK(standard.summary.totalPaidToLoan, false);
        Utils.getEl('heroTerm').textContent = `${Math.ceil(standard.summary.termMonths / 12)} Ã¡r`;

        // Cashflow metric (what user actually pays)
        this.updateHeroCashflow(params, standard);

        // Minimum payment display
        Utils.getEl('minimumPaymentDisplay').textContent = Utils.formatISK(standard.summary.firstPayment);

        // Net rental display
        if (params.rentalEnabled) {
            const netRent = LoanCalculator.calculateNetRent({
                grossRent: params.grossRent,
                taxRate: params.taxRate,
                vacancyRate: params.vacancyRate,
                operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts,
                indexed: false
            });
            Utils.getEl('netRentalDisplay').textContent = Utils.formatISK(netRent);
        }

        // Summary cards
        this.renderSummaryCard('standard-summary', standard.summary);
        if (nonIndexed) this.renderSummaryCard('non-indexed-summary', nonIndexed.summary);
        if (accelerated) this.renderSummaryCard('extra-payment-summary', accelerated.summary, params);

        // Savings summary
        this.updateSavingsSummary(standard, accelerated, params);
    }

    updateHeroCashflow(params, standard) {
        const heroCashflow = Utils.getEl('heroCashflow');
        if (!heroCashflow) return;

        if (params.rentalEnabled) {
            const netRent = LoanCalculator.calculateNetRent({
                grossRent: params.grossRent,
                taxRate: params.taxRate,
                vacancyRate: params.vacancyRate,
                operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts,
                indexed: false
            });
            const baseLoanPayment = standard.summary.firstPayment;

            if (params.applyRentToLoan) {
                if (netRent >= baseLoanPayment) {
                    heroCashflow.textContent = '0 kr.';
                    heroCashflow.className = 'text-2xl md:text-3xl font-bold stat-number text-green-300';
                } else {
                    heroCashflow.textContent = Utils.formatISK(baseLoanPayment - netRent, false);
                    heroCashflow.className = 'text-2xl md:text-3xl font-bold stat-number text-red-300';
                }
            } else {
                const cashflow = netRent - baseLoanPayment;
                heroCashflow.textContent = Utils.formatISK(Math.abs(cashflow), false);
                heroCashflow.className = 'text-2xl md:text-3xl font-bold stat-number ' +
                    (cashflow >= 0 ? 'text-green-300' : 'text-red-300');
            }
        } else {
            heroCashflow.textContent = Utils.formatISK(standard.summary.firstPayment, false);
            heroCashflow.className = 'text-2xl md:text-3xl font-bold text-white stat-number';
        }
    }

    renderSummaryCard(containerId, summary, params = null) {
        const container = Utils.getEl(containerId);
        if (!container || !summary) return;

        const years = Math.floor(summary.termMonths / 12);
        const months = summary.termMonths % 12;

        container.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="text-slate-600 dark:text-slate-400">1. greiÃ°sla</span>
                <span class="font-bold">${Utils.formatISK(summary.firstPayment, false)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-600 dark:text-slate-400">LÃ¡nstÃ­mi</span>
                <span class="font-semibold">${years}Ã¡ ${months}m</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-600 dark:text-slate-400">Heildarvextir</span>
                <span class="font-semibold text-red-600 dark:text-red-400">${Utils.formatISK(summary.totalInterest, false)}</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                <span class="font-medium">Samtals</span>
                <span class="font-bold">${Utils.formatISK(summary.totalPaidToLoan, false)}</span>
            </div>
        `;
    }

    updateSavingsSummary(standard, accelerated, params) {
        const container = Utils.getEl('savings-summary');
        if (!container || !standard || !accelerated) return;

        const savedMonths = standard.summary.termMonths - accelerated.summary.termMonths;
        const savedMoneyMetric = (params.rentalEnabled && params.applyRentToLoan)
            ? 'totalPaidByUser'
            : 'totalPaidToLoan';
        const savedMoney = standard.summary[savedMoneyMetric] - accelerated.summary[savedMoneyMetric];

        if (savedMonths > 0 || savedMoney > 0) {
            let source = 'flÃ½tiÃ¡Ã¦tlun';
            if (params.rentalEnabled && params.applyRentToLoan && params.extraPayment > 0) {
                source = 'leigutekjum og aukagreiÃ°slum';
            } else if (params.rentalEnabled && params.applyRentToLoan) {
                source = 'leigutekjum';
            } else if (params.extraPayment > 0) {
                source = 'aukagreiÃ°slum';
            }

            container.className = 'mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800';
            container.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <div>
                        <p class="font-bold text-green-800 dark:text-green-300">MeÃ° ${source} sparar Ã¾Ãº:</p>
                        <p class="text-green-700 dark:text-green-400">
                            <span class="font-bold text-lg">${Utils.formatISK(savedMoney)}</span> og 
                            <span class="font-bold text-lg">${Math.floor(savedMonths / 12)} Ã¡r og ${savedMonths % 12} mÃ¡nuÃ°i</span>
                        </p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '';
            container.className = 'mt-4 p-4 rounded-lg';
        }
    }

    // Continue in part 2...
    updateCashflowSection(params) {
        const standard = this.scheduleData.standard;
        if (!standard) return;

        const operatingCosts = params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts;
        const netRent = LoanCalculator.calculateNetRent({
            grossRent: params.grossRent,
            taxRate: params.taxRate,
            vacancyRate: params.vacancyRate,
            operatingCosts
        });

        const rentalPeriodText = params.rentalDurationYears > 0
            ? `${params.rentalDurationYears} Ã¡r`
            : 'allan lÃ¡nstÃ­mann';

        const baseLoanPayment = standard.summary.firstPayment;
        const taxAmount = params.grossRent * params.taxRate;
        const vacancyLoss = params.grossRent * params.vacancyRate;

        Utils.getEl('cfGrossRent').textContent = Utils.formatISK(params.grossRent);
        Utils.getEl('cfTax').textContent = `-${Utils.formatISK(taxAmount)}`;
        Utils.getEl('cfVacancy').textContent = `-${Utils.formatISK(vacancyLoss)}`;
        Utils.getEl('cfOperating').textContent = `-${Utils.formatISK(operatingCosts)}`;
        Utils.getEl('cfNetRent').textContent = Utils.formatISK(netRent);
        Utils.getEl('cfMortgage').textContent = `-${Utils.formatISK(baseLoanPayment)}`;

        let outOfPocket, annualCashflow;
        const breakEvenInfo = Utils.getEl('breakEvenInfo');

        if (params.applyRentToLoan) {
            if (netRent >= baseLoanPayment) {
                outOfPocket = 0;
                const extra = netRent - baseLoanPayment;
                annualCashflow = 0;
                breakEvenInfo.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">ðŸŽ‰</span>
                        <div>
                            <p class="font-semibold text-green-700 dark:text-green-400">Leigan dekkir lÃ¡niÃ°!</p>
                            <p class="text-sm text-green-600 dark:text-green-500">
                                ${Utils.formatISK(extra)} Ã­ viÃ°bÃ³t fer Ã¡ hÃ¶fuÃ°stÃ³l Ã­ hverjum mÃ¡nuÃ°i.
                            </p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miÃ°aÃ° viÃ° leigu Ã­ ${rentalPeriodText}.</p>
                        </div>
                    </div>
                `;
                breakEvenInfo.className = 'p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700';
            } else {
                outOfPocket = baseLoanPayment - netRent;
                annualCashflow = -outOfPocket * 12;
                breakEvenInfo.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">ðŸ’¡</span>
                        <div>
                            <p class="font-semibold text-amber-700 dark:text-amber-400">Leigan dekkir hluta lÃ¡nsins</p>
                            <p class="text-sm text-amber-600 dark:text-amber-500">
                                ÃžÃº Ã¾arft aÃ° leggja til ${Utils.formatISK(outOfPocket)} Ã¡ mÃ¡nuÃ°i.
                            </p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miÃ°aÃ° viÃ° leigu Ã­ ${rentalPeriodText}.</p>
                        </div>
                    </div>
                `;
                breakEvenInfo.className = 'p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700';
            }
        } else {
            outOfPocket = baseLoanPayment - netRent;
            annualCashflow = (netRent - baseLoanPayment) * 12;

            if (netRent > baseLoanPayment) {
                breakEvenInfo.innerHTML = `<p class="text-sm text-green-700 dark:text-green-400">
                    <span class="font-bold">JÃ¡kvÃ¦tt sjÃ³Ã°streymi!</span> Leigan er hÃ¦rri en lÃ¡nakostnaÃ°ur.
                </p><p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miÃ°aÃ° viÃ° leigu Ã­ ${rentalPeriodText}.</p>`;
                breakEvenInfo.className = 'p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700';
            } else {
                breakEvenInfo.innerHTML = `<p class="text-sm text-amber-700 dark:text-amber-400">
                    LÃ¡nakostnaÃ°ur er hÃ¦rri en leigutekjur um ${Utils.formatISK(baseLoanPayment - netRent)} Ã¡ mÃ¡nuÃ°i.
                </p><p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miÃ°aÃ° viÃ° leigu Ã­ ${rentalPeriodText}.</p>`;
                breakEvenInfo.className = 'p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700';
            }
        }

        const cfNet = Utils.getEl('cfNet');
        cfNet.textContent = Utils.formatISK(outOfPocket);
        cfNet.className = 'font-bold text-xl ' + (outOfPocket > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400');

        const cfAnnual = Utils.getEl('cfAnnual');
        cfAnnual.textContent = Utils.formatISK(annualCashflow);
        cfAnnual.className = 'font-bold ' + (annualCashflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
    }

    updateInvestmentDashboard(params) {
        const standard = this.scheduleData.standard;
        const useAccelerated = (
            (params.rentalEnabled && params.applyRentToLoan) ||
            params.extraPayment > 0 ||
            params.fixedPayment > 0
        );

        const activeSchedule = useAccelerated
            ? this.scheduleData.accelerated
            : standard;

        if (!activeSchedule) return;

        const metrics = LoanCalculator.calculateInvestmentMetrics({
            propertyPrice: params.propertyPrice,
            downPaymentPercent: params.downPaymentPercent,
            loanFee: params.loanFee,
            schedule: activeSchedule.schedule,
            holdingYears: params.holdingPeriod,
            appreciationRate: params.appreciationRate,
            sellingCostRate: params.sellingCostRate,
            rentalIncome: params.rentalEnabled ? {
                grossRent: params.grossRent,
                taxRate: params.taxRate,
                vacancyRate: params.vacancyRate,
                operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts
            } : null
        });

        if (!metrics) return;

        Utils.getEl('invFutureValue').textContent = Utils.formatISK(metrics.futurePropertyValue, false);
        Utils.getEl('invEquityGain').textContent = Utils.formatISK(metrics.equityAtSale, false);
        Utils.getEl('invCoC').textContent = `${metrics.cashOnCashReturn.toFixed(1)}%`;
        Utils.getEl('invTotalProfit').textContent = Utils.formatISK(metrics.totalProfit, false);
        Utils.getEl('invYearsLabel1').textContent = params.holdingPeriod;

        // Update timeline and equity progress
        this.renderInvestmentTimeline(metrics, params);
        this.renderEquityProgress(metrics, params);
    }

    renderInvestmentTimeline(metrics, params) {
        const container = Utils.getEl('investmentTimeline');
        if (!container || !metrics.breakdownByYear) return;

        const years = [1, 3, 5, 10, Math.min(params.holdingPeriod, 30)]
            .filter((v, i, a) => a.indexOf(v) === i && v <= params.holdingPeriod)
            .sort((a, b) => a - b);

        let html = '<div class="flex justify-between items-start">';
        
        years.forEach((year, index) => {
            const data = metrics.breakdownByYear[year] || metrics.breakdownByYear[metrics.breakdownByYear.length - 1];
            const isLast = index === years.length - 1;

            html += `
                <div class="flex flex-col items-center ${isLast ? '' : 'flex-1'}">
                    <div class="timeline-dot border-blue-500 ${year === params.holdingPeriod ? 'bg-blue-500' : ''}"></div>
                    <div class="text-center mt-2">
                        <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Ãr ${year}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${Utils.formatCompact(data.propertyValue)} kr.</p>
                        <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">EigiÃ° fÃ©: ${Utils.formatCompact(data.equity)}</p>
                    </div>
                </div>
                ${!isLast ? '<div class="flex-1 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 mt-2 mx-1"></div>' : ''}
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderEquityProgress(metrics, params) {
        const container = Utils.getEl('equityProgressSection');
        if (!container) return;

        const downPayment = params.propertyPrice * (params.downPaymentPercent / 100);
        const equityFromDownPayment = downPayment;
        const equityFromPrincipal = params.loanAmount - metrics.loanBalanceAtSale;
        const equityFromAppreciation = metrics.futurePropertyValue - params.propertyPrice;
        const totalEquity = equityFromDownPayment + equityFromPrincipal + equityFromAppreciation;

        container.innerHTML = `
            <div class="space-y-3">
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-600 dark:text-slate-400">Ãštborgun</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromDownPayment, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full progress-bar-fill" style="width: ${(equityFromDownPayment / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-600 dark:text-slate-400">Afborganir hÃ¶fuÃ°stÃ³ls</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromPrincipal, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-green-500 rounded-full progress-bar-fill" style="width: ${(equityFromPrincipal / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-600 dark:text-slate-400">VerÃ°hÃ¦kkun eignar</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromAppreciation, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-purple-500 rounded-full progress-bar-fill" style="width: ${(equityFromAppreciation / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div class="pt-3 border-t border-slate-200 dark:border-slate-600">
                    <div class="flex justify-between">
                        <span class="font-bold">Heildar eigiÃ° fÃ©</span>
                        <span class="font-bold text-lg text-purple-600 dark:text-purple-400">${Utils.formatISK(totalEquity, false)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== CHARTS ====================
    updateCharts() {
        const { standard, accelerated, nonIndexed } = this.scheduleData;
        const params = this.getParams();

        this.chartManager.createBalanceChart('balanceChart', { standard, accelerated, nonIndexed });
        
        if (standard) {
            this.chartManager.createPaymentBreakdownChart('paymentBreakdownChart', standard);
        }

        // Equity chart with investment metrics
        const activeSchedule = (params.rentalEnabled && params.applyRentToLoan) ? accelerated : standard;
        if (activeSchedule) {
            const metrics = LoanCalculator.calculateInvestmentMetrics({
                propertyPrice: params.propertyPrice,
                downPaymentPercent: params.downPaymentPercent,
                loanFee: params.loanFee,
                schedule: activeSchedule.schedule,
                holdingYears: Math.ceil(activeSchedule.schedule.length / 12),
                appreciationRate: params.appreciationRate,
                sellingCostRate: params.sellingCostRate
            });
            if (metrics) {
                this.chartManager.createEquityChart('equityChart', metrics);
            }
        }

        if (standard) {
            this.chartManager.createCostPieChart('costPieChart', standard.summary, params.loanAmount, params.loanFee);
        }

        if (params.rentalEnabled && activeSchedule) {
            this.chartManager.createCashflowChart('cashflowChart', activeSchedule, {
                grossRent: params.grossRent,
                taxRate: params.taxRate,
                vacancyRate: params.vacancyRate,
                operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees + params.customCosts,
                indexed: params.indexRent,
                annualInflationRate: params.annualInflationRate,
                rentalDurationMonths: params.rentalDurationMonths
            }, params.applyRentToLoan);
        }
    }

    // ==================== DETAILED TABLE ====================
    renderDetailedTable() {
        const selectedView = document.querySelector('input[name="scheduleView"]:checked')?.value || 'standard';
        const data = selectedView === 'standard' ? this.scheduleData.standard : this.scheduleData.accelerated;
        const displayCount = Utils.getEl('scheduleDisplayCount')?.value || '60';
        const tbody = Utils.getEl('detailed-table-body');

        if (!tbody || !data?.schedule) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="13" class="p-4 text-center text-slate-500">Engin gÃ¶gn</td></tr>';
            return;
        }

        const rowsToShow = displayCount === 'all' 
            ? data.schedule 
            : data.schedule.slice(0, parseInt(displayCount));

        let html = '';
        rowsToShow.forEach((row, index) => {
            const isEvenRow = index % 2 === 0;
            html += `
                <tr class="${isEvenRow ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700'}">
                    <td class="p-2.5 font-medium">${row.month}</td>
                    <td class="p-2.5 text-slate-600 dark:text-slate-400">${Utils.formatDate(row.date)}</td>
                    <td class="p-2.5 text-right">${Utils.formatISK(row.inflation, false)}</td>
                    <td class="p-2.5 text-right text-blue-600 dark:text-blue-400">${Utils.formatISK(row.principal, false)}</td>
                    <td class="p-2.5 text-right text-red-600 dark:text-red-400">${Utils.formatISK(row.interest, false)}</td>
                    <td class="p-2.5 text-right">${Utils.formatISK(row.fee, false)}</td>
                    <td class="p-2.5 text-right font-medium text-slate-700 dark:text-slate-200">${Utils.formatISK(row.requiredPayment, false)}</td>
                    <td class="p-2.5 text-right text-emerald-600 dark:text-emerald-400">${Utils.formatISK(row.manualExtra, false)}</td>
                    <td class="p-2.5 text-right text-green-600 dark:text-green-400">${Utils.formatISK(row.rentalContribution, false)}</td>
                    <td class="p-2.5 text-right text-teal-600 dark:text-teal-400">${Utils.formatISK(row.rentBasedExtra, false)}</td>
                    <td class="p-2.5 text-right font-medium">${Utils.formatISK(row.userOutOfPocket, false)}</td>
                    <td class="p-2.5 text-right font-medium">${Utils.formatISK(row.totalPaymentToLoan, false)}</td>
                    <td class="p-2.5 text-right font-bold">${Utils.formatISK(row.balance, false)}</td>
                </tr>
            `;
        });

        if (displayCount !== 'all' && data.schedule.length > parseInt(displayCount)) {
            html += `
                <tr class="bg-slate-50 dark:bg-slate-700">
                    <td colspan="13" class="p-3 text-center text-sm text-slate-500 dark:text-slate-400">
                        ... og ${data.schedule.length - parseInt(displayCount)} lÃ­nur Ã­ viÃ°bÃ³t
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    }

    // ==================== CUSTOM COSTS ====================
    renderCostBreakdownBars(params) {
        const container = Utils.getEl('costBreakdownBars');
        if (!container) return;

        const costs = [
            { name: 'FasteignagjÃ¶ld', amount: params.propertyTax, color: 'bg-blue-500' },
            { name: 'Tryggingar', amount: params.insurance, color: 'bg-green-500' },
            { name: 'ViÃ°hald', amount: params.maintenance, color: 'bg-yellow-500' },
            { name: 'HÃºsfÃ©lags', amount: params.hoaFees, color: 'bg-purple-500' },
            ...this.customCostsManager.getAll().map(c => ({ name: c.name, amount: c.amount, color: 'bg-orange-500' }))
        ];

        const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
        const maxCost = Math.max(...costs.map(c => c.amount), 1);

        container.innerHTML = costs.map(cost => `
            <div class="flex items-center gap-2">
                <span class="w-24 text-xs text-slate-600 dark:text-slate-400 truncate">${cost.name}</span>
                <div class="flex-1 h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div class="${cost.color} h-full rounded-full transition-all duration-500" style="width: ${(cost.amount / maxCost * 100)}%"></div>
                </div>
                <span class="w-20 text-xs font-medium text-right">${Utils.formatISK(cost.amount, false)}</span>
            </div>
        `).join('') + `
            <div class="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                <span class="w-24 text-xs font-bold">Samtals</span>
                <div class="flex-1"></div>
                <span class="w-20 text-sm font-bold text-right">${Utils.formatISK(totalCost, false)}</span>
            </div>
        `;
    }

    renderCustomCosts() {
        const container = Utils.getEl('customCostsList');
        if (!container) return;

        const costs = this.customCostsManager.getAll();
        container.innerHTML = costs.map((cost, i) => `
            <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-600 rounded-lg">
                <span class="flex-1 text-sm font-medium">${cost.name}</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">${Utils.formatISK(cost.amount, false)} kr.</span>
                <button class="text-red-500 hover:text-red-700 delete-custom-cost" data-index="${i}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.delete-custom-cost').forEach(btn => {
            btn.addEventListener('click', () => {
                this.customCostsManager.remove(parseInt(btn.dataset.index));
                this.renderCustomCosts();
                this.debouncedCalculate();
            });
        });
    }

    addCustomCost() {
        const nameInput = Utils.getEl('newCostName');
        const amountInput = Utils.getEl('newCostAmount');
        
        const name = nameInput?.value?.trim();
        const amount = parseFloat(amountInput?.value) || 0;

        if (name && amount > 0) {
            this.customCostsManager.add(name, amount);
            if (nameInput) nameInput.value = '';
            if (amountInput) amountInput.value = '';
            this.renderCustomCosts();
            this.debouncedCalculate();
        }
    }

    // ==================== SCENARIOS ====================
    renderScenarios() {
        const container = Utils.getEl('savedScenarios');
        if (!container) return;

        const scenarios = this.scenarioManager.getAll();
        if (scenarios.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Engar vistaÃ°ar forsendur</p>';
            return;
        }

        container.innerHTML = scenarios.map((s, i) => `
            <div class="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <button class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline load-scenario" data-index="${i}">${s.name}</button>
                <button class="text-red-500 hover:text-red-700 delete-scenario" data-index="${i}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.load-scenario').forEach(btn => {
            btn.addEventListener('click', () => this.loadScenario(parseInt(btn.dataset.index)));
        });
        container.querySelectorAll('.delete-scenario').forEach(btn => {
            btn.addEventListener('click', () => {
                this.scenarioManager.remove(parseInt(btn.dataset.index));
                this.renderScenarios();
            });
        });
    }

    saveScenario() {
        const nameInput = Utils.getEl('scenarioName');
        const name = nameInput?.value?.trim() || `Forsendur ${this.scenarioManager.getAll().length + 1}`;
        const params = this.getParams();
        
        this.scenarioManager.add(name, params);
        if (nameInput) nameInput.value = '';
        this.renderScenarios();
    }

    loadScenario(index) {
        const scenario = this.scenarioManager.get(index);
        if (!scenario) return;

        const p = scenario.params;
        
        // Restore all values
        this.setInputValue('loanType', p.loanType);
        this.setInputValue('propertyPrice', p.propertyPrice);
        Utils.getEl('propertyPriceFormatted').value = p.propertyPrice?.toLocaleString('is-IS');
        Utils.getEl('propertyPriceSlider').value = p.propertyPrice;
        this.setInputValue('downPaymentPercent', p.downPaymentPercent);
        Utils.getEl('downPaymentSlider').value = p.downPaymentPercent;
        this.setInputValue('loanFee', p.loanFee);
        this.setInputValue('paymentFee', p.monthlyFee);
        this.setInputValue('interestRate', p.annualInterestRate * 100);
        Utils.getEl('interestRateSlider').value = p.annualInterestRate * 100;
        this.setInputValue('inflationRate', p.annualInflationRate * 100);
        Utils.getEl('inflationRateSlider').value = p.annualInflationRate * 100;
        this.setInputValue('loanTerm', p.loanTermYears);
        Utils.getEl('loanTermSlider').value = p.loanTermYears;
        this.setInputValue('extraPayment', p.extraPayment);
        Utils.getEl('extraPaymentSlider').value = p.extraPayment;
        Utils.getEl('indexExtraPayment').checked = p.indexExtraPayment;
        this.setInputValue('fixedPayment', p.fixedPayment);
        Utils.getEl('fixedPaymentSlider').value = p.fixedPayment;

        Utils.getEl('enableRental').checked = p.rentalEnabled;
        Utils.getEl('applyRentToLoan').checked = p.applyRentToLoan;
        this.setInputValue('monthlyRent', p.grossRent);
        Utils.getEl('monthlyRentSlider').value = p.grossRent;
        Utils.getEl('indexRent').checked = p.indexRent;
        this.setInputValue('incomeTaxRate', p.taxRate * 100);
        this.setInputValue('propertyTax', p.propertyTax);
        this.setInputValue('insurance', p.insurance);
        this.setInputValue('maintenance', p.maintenance);
        this.setInputValue('hoaFees', p.hoaFees);
        this.setInputValue('vacancyRate', p.vacancyRate * 100);
        this.setInputValue('rentalDurationYears', p.rentalDurationYears);
        const rentalDurationSlider = Utils.getEl('rentalDurationSlider');
        if (rentalDurationSlider) rentalDurationSlider.value = p.rentalDurationYears;

        this.setInputValue('appreciationRate', p.appreciationRate * 100);
        Utils.getEl('appreciationSlider').value = p.appreciationRate * 100;
        this.setInputValue('holdingPeriod', p.holdingPeriod);
        Utils.getEl('holdingPeriodSlider').value = p.holdingPeriod;
        this.setInputValue('sellingCosts', p.sellingCostRate * 100);

        // Trigger updates
        Utils.getEl('enableRental').dispatchEvent(new Event('change'));
        Utils.getEl('loanType').dispatchEvent(new Event('change'));
        this.updateLoanAmount();
        this.calculate();
    }

    setInputValue(id, value) {
        const el = Utils.getEl(id);
        if (el) el.value = value;
    }

    // ==================== EXPORT ====================
    exportCSV() {
        const selectedView = document.querySelector('input[name="scheduleView"]:checked')?.value || 'standard';
        const data = selectedView === 'standard' ? this.scheduleData.standard : this.scheduleData.accelerated;

        if (!data?.schedule) return;

        const csv = Utils.generateCSV(data.schedule, { includeUserPayment: true });
        Utils.downloadFile(csv, `greidslaaetlun_${selectedView}_${new Date().toISOString().slice(0, 10)}.csv`);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LoanCalculatorApp();
});
