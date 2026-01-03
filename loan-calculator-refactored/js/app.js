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
        Utils.getEl('heroTerm').textContent = `${Math.ceil(standard.summary.termMonths / 12)} ár`;

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
                <span class="text-slate-600 dark:text-slate-400">1. greiðsla</span>
                <span class="font-bold">${Utils.formatISK(summary.firstPayment, false)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-600 dark:text-slate-400">Lánstími</span>
                <span class="font-semibold">${years}á ${months}m</span>
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
            let source = 'flýtiáætlun';
            if (params.rentalEnabled && params.applyRentToLoan && params.extraPayment > 0) {
                source = 'leigutekjum og aukagreiðslum';
            } else if (params.rentalEnabled && params.applyRentToLoan) {
                source = 'leigutekjum';
            } else if (params.extraPayment > 0) {
                source = 'aukagreiðslum';
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
                        <p class="font-bold text-green-800 dark:text-green-300">Með ${source} sparar þú:</p>
                        <p class="text-green-700 dark:text-green-400">
                            <span class="font-bold text-lg">${Utils.formatISK(savedMoney)}</span> og 
                            <span class="font-bold text-lg">${Math.floor(savedMonths / 12)} ár og ${savedMonths % 12} mánuði</span>
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
            ? `${params.rentalDurationYears} ár`
            : 'allan lánstímann';

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
                        <span class="text-2xl">🎉</span>
                        <div>
                            <p class="font-semibold text-green-700 dark:text-green-400">Leigan dekkir lánið!</p>
                            <p class="text-sm text-green-600 dark:text-green-500">
                                ${Utils.formatISK(extra)} í viðbót fer á höfuðstól í hverjum mánuði.
                            </p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miðað við leigu í ${rentalPeriodText}.</p>
                        </div>
                    </div>
                `;
                breakEvenInfo.className = 'p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700';
            } else {
                outOfPocket = baseLoanPayment - netRent;
                annualCashflow = -outOfPocket * 12;
                breakEvenInfo.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">💡</span>
                        <div>
                            <p class="font-semibold text-amber-700 dark:text-amber-400">Leigan dekkir hluta lánsins</p>
                            <p class="text-sm text-amber-600 dark:text-amber-500">
                                Þú þarft að leggja til ${Utils.formatISK(outOfPocket)} á mánuði.
                            </p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miðað við leigu í ${rentalPeriodText}.</p>
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
                    <span class="font-bold">Jákvætt sjóðstreymi!</span> Leigan er hærri en lánakostnaður.
                </p><p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miðað við leigu í ${rentalPeriodText}.</p>`;
                breakEvenInfo.className = 'p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700';
            } else {
                breakEvenInfo.innerHTML = `<p class="text-sm text-amber-700 dark:text-amber-400">
                    Lánakostnaður er hærri en leigutekjur um ${Utils.formatISK(baseLoanPayment - netRent)} á mánuði.
                </p><p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Forsendur miðað við leigu í ${rentalPeriodText}.</p>`;
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
                        <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Ár ${year}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${Utils.formatCompact(data.propertyValue)} kr.</p>
                        <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">Eigið fé: ${Utils.formatCompact(data.equity)}</p>
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
                        <span class="text-slate-600 dark:text-slate-400">Útborgun</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromDownPayment, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full progress-bar-fill" style="width: ${(equityFromDownPayment / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-600 dark:text-slate-400">Afborganir höfuðstóls</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromPrincipal, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-green-500 rounded-full progress-bar-fill" style="width: ${(equityFromPrincipal / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-600 dark:text-slate-400">Verðhækkun eignar</span>
                        <span class="font-semibold">${Utils.formatISK(equityFromAppreciation, false)}</span>
                    </div>
                    <div class="h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-purple-500 rounded-full progress-bar-fill" style="width: ${(equityFromAppreciation / totalEquity * 100).toFixed(1)}%"></div>
                    </div>
                </div>
                <div class="pt-3 border-t border-slate-200 dark:border-slate-600">
                    <div class="flex justify-between">
                        <span class="font-bold">Heildar eigið fé</span>
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
            if (tbody) tbody.innerHTML = '<tr><td colspan="13" class="p-4 text-center text-slate-500">Engin gögn</td></tr>';
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
                        ... og ${data.schedule.length - parseInt(displayCount)} línur í viðbót
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
            { name: 'Fasteignagjöld', amount: params.propertyTax, color: 'bg-blue-500' },
            { name: 'Tryggingar', amount: params.insurance, color: 'bg-green-500' },
            { name: 'Viðhald', amount: params.maintenance, color: 'bg-yellow-500' },
            { name: 'Húsfélags', amount: params.hoaFees, color: 'bg-purple-500' },
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
            container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Engar vistaðar forsendur</p>';
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
