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
