/**
 * Dashboard Calculator Application
 * Specialized version of the loan calculator for the dashboard
 */

class DashboardCalculatorApp {
  constructor() {
    this.scheduleData = {
      standard: null,
      accelerated: null,
      nonIndexed: null
    };

    this.chartManager = new ChartManager();
    this.scenarioManager = new ScenarioManager();
    this.debounceTimer = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupSliderSync();
    this.updateLoanAmount();

    // Initial calculation
    this.calculate();

    // Expose to window for prefilling
    window.dashboardApp = this;
  }

  // ==================== EVENT LISTENERS ====================
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Loan type change
    document.getElementById('loanType')?.addEventListener('change', (e) => this.handleLoanTypeChange(e));

    // Rental toggle
    document.getElementById('enableRental')?.addEventListener('change', (e) => this.handleRentalToggle(e));

    // All input changes trigger recalculation
    this.setupInputListeners();

    // Scenario management
    document.getElementById('saveScenario')?.addEventListener('click', () => this.saveScenario());
  }

  setupSliderSync() {
    const sliderPairs = [
      { slider: 'propertyPriceSlider', input: 'propertyPrice', formatted: 'propertyPriceFormatted' },
      { slider: 'downPaymentSlider', input: 'downPaymentPercent' },
      { slider: 'interestRateSlider', input: 'interestRate' },
      { slider: 'inflationRateSlider', input: 'inflationRate' },
      { slider: 'loanTermSlider', input: 'loanTerm' },
      { slider: 'monthlyRentSlider', input: 'monthlyRent' },
      { slider: 'rentalDurationSlider', input: 'rentalDurationYears' },
      { slider: 'appreciationSlider', input: 'appreciationRate' },
      { slider: 'holdingPeriodSlider', input: 'holdingPeriod' }
    ];

    sliderPairs.forEach(({ slider, input, formatted }) => {
      const sliderEl = document.getElementById(slider);
      const inputEl = document.getElementById(input);
      const formattedEl = formatted ? document.getElementById(formatted) : null;

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
    const propFormatted = document.getElementById('propertyPriceFormatted');
    const propHidden = document.getElementById('propertyPrice');
    const propSlider = document.getElementById('propertyPriceSlider');

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
  }

  // ==================== TAB NAVIGATION ====================
  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'bg-brand-blue', 'text-white', 'shadow-lg', 'shadow-brand-blue/20');
      b.classList.add('bg-white/5', 'text-slate-400');
    });

    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active', 'bg-brand-blue', 'text-white', 'shadow-lg', 'shadow-brand-blue/20');
      activeBtn.classList.remove('bg-white/5', 'text-slate-400');
    }

    document.querySelectorAll('[id^="tab-"]').forEach(panel => {
      panel.classList.add('hidden');
    });
    document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  }

  // ==================== HANDLERS ====================
  handleLoanTypeChange(e) {
    const type = e.target.value;
    const interestRate = document.getElementById('interestRate');
    const interestSlider = document.getElementById('interestRateSlider');

    // Suggest typical rates
    if (type === 'indexedAnnuity') {
      if (interestRate) interestRate.value = 4.45;
      if (interestSlider) interestSlider.value = 4.45;
    } else {
      if (interestRate) interestRate.value = 8.5;
      if (interestSlider) interestSlider.value = 8.5;
    }

    this.debouncedCalculate();
  }

  handleRentalToggle(e) {
    const enabled = e.target.checked;
    const rentalFields = document.getElementById('rentalFields');
    const cashflowSection = document.getElementById('cashflowSection');

    if (rentalFields) {
      rentalFields.classList.toggle('opacity-50', !enabled);
      rentalFields.classList.toggle('pointer-events-none', !enabled);
    }
    if (cashflowSection) cashflowSection.classList.toggle('hidden', !enabled);

    this.debouncedCalculate();
  }

  // ==================== LOAN AMOUNT CALCULATION ====================
  updateLoanAmount() {
    const price = parseFloat(document.getElementById('propertyPrice')?.value) || 0;
    const downPct = parseFloat(document.getElementById('downPaymentPercent')?.value) || 0;
    const downAmount = price * (downPct / 100);
    const loanAmount = price - downAmount;

    // Update displays
    const downAmountEl = document.getElementById('downPaymentAmount');
    const loanAmountEl = document.getElementById('loanAmount');
    const loanAmountFormattedEl = document.getElementById('loanAmountFormatted');

    if (downAmountEl) downAmountEl.textContent = Utils.formatISK(downAmount, false);
    if (loanAmountEl) loanAmountEl.value = loanAmount;
    if (loanAmountFormattedEl) loanAmountFormattedEl.value = Utils.formatISK(loanAmount, false);
  }

  // ==================== GET PARAMETERS ====================
  getParams() {
    const numberOrDefault = (id, defaultValue = 0) => {
      const el = document.getElementById(id);
      if (!el) return defaultValue;
      const parsed = parseFloat(el.value);
      return Number.isNaN(parsed) ? defaultValue : parsed;
    };

    const checkedOrDefault = (id, defaultValue = false) => {
      const el = document.getElementById(id);
      return el ? el.checked : defaultValue;
    };

    const loanTermYears = numberOrDefault('loanTerm', 40);
    const rentalDurationYears = numberOrDefault('rentalDurationYears', 30);
    const rentalDurationMonths = rentalDurationYears > 0 ? rentalDurationYears * 12 : loanTermYears * 12;

    return {
      loanType: document.getElementById('loanType')?.value || 'indexedAnnuity',
      propertyPrice: numberOrDefault('propertyPrice'),
      loanAmount: parseFloat(document.getElementById('loanAmount')?.value) || 0,
      downPaymentPercent: numberOrDefault('downPaymentPercent'),
      annualInterestRate: numberOrDefault('interestRate') / 100,
      annualInflationRate: numberOrDefault('inflationRate') / 100,
      loanTermYears,

      // Rental
      rentalEnabled: checkedOrDefault('enableRental'),
      applyRentToLoan: checkedOrDefault('applyRentToLoan'),
      grossRent: numberOrDefault('monthlyRent'),
      indexRent: checkedOrDefault('indexRent', true),
      taxRate: numberOrDefault('incomeTaxRate', 11) / 100,
      propertyTax: numberOrDefault('propertyTax'),
      insurance: numberOrDefault('insurance'),
      maintenance: numberOrDefault('maintenance'),
      hoaFees: numberOrDefault('hoaFees'),

      // Investment
      appreciationRate: numberOrDefault('appreciationRate', 3.5) / 100,
      holdingPeriod: numberOrDefault('holdingPeriod', 10),
      sellingCostRate: numberOrDefault('sellingCosts', 2.5) / 100
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
      vacancyRate: 0.05, // Hardcoded for now
      operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees,
      indexed: params.indexRent,
      indexCosts: params.indexRent,
      applyToLoan: params.applyRentToLoan,
      rentalDurationMonths: params.rentalDurationMonths
    } : null;

    // Calculate standard schedule
    this.scheduleData.standard = LoanCalculator.calculateSchedule({
      loanAmount: params.loanAmount,
      annualInterestRate: params.annualInterestRate,
      annualInflationRate: params.annualInflationRate,
      loanTermYears: params.loanTermYears,
      loanType: params.loanType
    });

    // Calculate accelerated schedule
    this.scheduleData.accelerated = LoanCalculator.calculateSchedule({
      loanAmount: params.loanAmount,
      annualInterestRate: params.annualInterestRate,
      annualInflationRate: params.annualInflationRate,
      loanTermYears: params.loanTermYears,
      loanType: params.loanType,
      rentalIncome: rentalIncome
    });

    // Calculate non-indexed comparison
    const nonIndexedRate = params.loanType !== 'indexedAnnuity'
      ? params.annualInterestRate
      : 0.085;

    this.scheduleData.nonIndexed = LoanCalculator.calculateSchedule({
      loanAmount: params.loanAmount,
      annualInterestRate: nonIndexedRate,
      annualInflationRate: 0,
      loanTermYears: params.loanTermYears,
      loanType: 'nonIndexedAnnuity'
    });

    // Update all displays
    this.updateDisplays(params);
    this.updateCharts();
    this.updateInvestmentDashboard(params);
    this.updateLTV(params);

    if (params.rentalEnabled) {
      this.updateCashflowSection(params);
    }

    this.renderDetailedTable();
  }

  updateLTV(params) {
    const ltv = (params.loanAmount / params.propertyPrice) * 100;
    const ltvValue = document.getElementById('ltvValue');
    const ltvBar = document.getElementById('ltvBar');
    if (ltvValue) ltvValue.textContent = `${ltv.toFixed(1)}%`;
    if (ltvBar) ltvBar.style.width = `${Math.min(ltv, 100)}%`;
  }

  renderDetailedTable() {
    const standard = this.scheduleData.standard;
    if (!standard || !standard.schedule) return;

    const container = document.getElementById('detailed-table-body');
    if (!container) return;

    let html = '';
    const schedule = standard.schedule;

    // Limits based on selector or default
    const countSelect = document.getElementById('scheduleDisplayCount');
    const limit = countSelect ? (countSelect.value === 'all' ? schedule.length : parseInt(countSelect.value)) : 60;

    for (let i = 0; i < Math.min(schedule.length, limit); i++) {
      html += this.renderTableRow(schedule[i]);
    }

    container.innerHTML = html;
  }

  renderTableRow(row) {
    return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td class="p-2.5 text-slate-500">${row.month}</td>
                <td class="p-2.5 font-medium text-slate-400 text-xs">${row.date.toLocaleDateString('is-IS', { month: 'short', year: '2-digit' })}</td>
                <td class="p-2.5 text-right text-orange-400">${Utils.formatISK(row.inflation, false)}</td>
                <td class="p-2.5 text-right">${Utils.formatISK(row.principal, false)}</td>
                <td class="p-2.5 text-right font-medium">${Utils.formatISK(row.interest, false)}</td>
                <td class="p-2.5 text-right text-slate-500">${Utils.formatISK(row.fee || 0, false)}</td>
                <td class="p-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">${Utils.formatISK(row.requiredPayment, false)}</td>
                <td class="p-2.5 text-right text-brand-neon">${Utils.formatISK(row.manualExtra, false)}</td>
                <td class="p-2.5 text-right text-brand-green">${Utils.formatISK(row.rentalContribution, false)}</td>
                <td class="p-2.5 text-right text-brand-green font-medium">${Utils.formatISK(row.rentBasedExtra, false)}</td>
                <td class="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">${Utils.formatISK(row.totalPaymentToLoan, false)}</td>
                <td class="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">${Utils.formatISK(row.balance, false)}</td>
            </tr>
        `;
  }

  // ==================== UPDATE DISPLAYS ====================
  updateDisplays(params) {
    const { standard, accelerated, nonIndexed } = this.scheduleData;
    if (!standard) return;

    // Hero metrics
    const firstPaymentEl = document.getElementById('heroPayment');
    const totalCostEl = document.getElementById('heroTotalCost');
    const termEl = document.getElementById('heroTerm');

    if (firstPaymentEl) firstPaymentEl.textContent = Utils.formatISK(standard.summary.firstPayment, false);
    if (totalCostEl) totalCostEl.textContent = Utils.formatISK(standard.summary.totalPaidToLoan, false);
    if (termEl) termEl.textContent = `${Math.ceil(standard.summary.termMonths / 12)} ár`;

    // Net rental display
    if (params.rentalEnabled) {
      const netRent = RentalCalculator.calculateMonthlyBreakdown({
        grossRent: params.grossRent,
        taxRate: params.taxRate,
        vacancyRate: 0.05,
        propertyTax: params.propertyTax,
        insurance: params.insurance,
        maintenance: params.maintenance,
        hoaFees: params.hoaFees
      }).netRent;
      const netRentalDisplay = document.getElementById('netRentalDisplay');
      if (netRentalDisplay) netRentalDisplay.textContent = Utils.formatISK(netRent);
    }

    // Summary cards
    this.renderSummaryCard('standard-summary', standard.summary);
    if (nonIndexed) this.renderSummaryCard('non-indexed-summary', nonIndexed.summary);
    if (accelerated) this.renderSummaryCard('extra-payment-summary', accelerated.summary);

    // Update Savings Summary
    this.updateSavingsSummary(standard, accelerated, params);
  }

  renderSummaryCard(containerId, summary) {
    const container = document.getElementById(containerId);
    if (!container || !summary) return;

    const years = Math.floor(summary.termMonths / 12);
    const months = summary.termMonths % 12;

    container.innerHTML = `
            <div class="flex justify-between items-center">
                <span>1. greiðsla</span>
                <span class="font-bold whitespace-nowrap">${Utils.formatISK(summary.firstPayment, false)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span>Lánstími</span>
                <span class="font-semibold">${years}á ${months}m</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-700/50 mt-2">
                <span class="font-medium text-white">Samtals</span>
                <span class="font-bold text-white whitespace-nowrap">${Utils.formatISK(summary.totalPaidToLoan, false)}</span>
            </div>
        `;
  }

  updateSavingsSummary(standard, accelerated, params) {
    const container = document.getElementById('savings-summary');
    if (!container || !standard || !accelerated) return;

    const savedMonths = standard.summary.termMonths - accelerated.summary.termMonths;
    const savedMoney = standard.summary.totalPaidToLoan - accelerated.summary.totalPaidToLoan;

    if (savedMonths > 0 || savedMoney > 1000) {
      container.className = 'mt-4 p-4 rounded-xl bg-brand-green/10 border border-brand-green/20';
      container.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-brand-green/20 rounded-full flex items-center justify-center text-brand-green">✓</div>
                    <div>
                        <p class="font-bold text-brand-green">Þú sparar:</p>
                        <p class="text-white">
                            <span class="font-bold text-lg">${Utils.formatISK(savedMoney)}</span> og 
                            <span class="font-bold text-lg">${Math.floor(savedMonths / 12)} ár og ${savedMonths % 12} mánuði</span>
                        </p>
                    </div>
                </div>
            `;
    } else {
      container.innerHTML = '';
      container.className = 'mt-4 hidden';
    }
  }

  updateCashflowSection(params) {
    const standard = this.scheduleData.standard;
    if (!standard) return;

    const netRent = RentalCalculator.calculateMonthlyBreakdown({
      grossRent: params.grossRent,
      taxRate: params.taxRate,
      vacancyRate: 0.05,
      propertyTax: params.propertyTax,
      insurance: params.insurance,
      maintenance: params.maintenance,
      hoaFees: params.hoaFees
    }).netRent;

    const baseLoanPayment = standard.schedule[0]?.totalPaymentToLoan || 0;

    const cfGrossRent = document.getElementById('cfGrossRent');
    const cfNetRent = document.getElementById('cfNetRent');
    const cfNet = document.getElementById('cfNet');
    const breakEvenInfo = document.getElementById('breakEvenInfo');

    if (cfGrossRent) cfGrossRent.textContent = Utils.formatISK(params.grossRent);
    if (cfNetRent) cfNetRent.textContent = Utils.formatISK(netRent);

    if (params.applyRentToLoan) {
      const outOfPocket = Math.max(0, baseLoanPayment - netRent);
      if (cfNet) {
        cfNet.textContent = Utils.formatISK(outOfPocket);
        cfNet.className = outOfPocket > 0 ? 'font-bold text-lg text-white' : 'font-bold text-lg text-brand-green';
      }
      if (breakEvenInfo) {
        if (netRent >= baseLoanPayment) {
          breakEvenInfo.innerHTML = `<p class="text-xs text-brand-green">Leigan dekkir lánið alveg og rúmlega það!</p>`;
        } else {
          breakEvenInfo.innerHTML = `<p class="text-xs text-slate-500">Leigan dekkir hlut af láninu. Þú borgar mismuninn.</p>`;
        }
      }
    } else {
      const cashflow = netRent - baseLoanPayment;
      if (cfNet) {
        cfNet.textContent = Utils.formatISK(Math.abs(cashflow));
        cfNet.className = cashflow >= 0 ? 'font-bold text-lg text-brand-green' : 'font-bold text-lg text-red-400';
      }
      if (breakEvenInfo) {
        breakEvenInfo.innerHTML = `<p class="text-xs text-slate-500">${cashflow >= 0 ? 'Jákvætt' : 'Neikvætt'} mánaðarlegt sjóðstreymi.</p>`;
      }
    }
  }

  updateCharts() {
    const { standard, accelerated, nonIndexed } = this.scheduleData;
    const params = this.getParams();

    this.chartManager.createBalanceChart('balanceChart', { standard, accelerated, nonIndexed });

    if (standard) {
      this.chartManager.createPaymentBreakdownChart('paymentBreakdownChart', standard);

      // Cost Pie Chart
      this.chartManager.createCostPieChart('costPieChart', standard.summary, params.loanAmount, 0);
    }

    // Investment metrics and Equity chart
    if (standard) {
      const metrics = LoanCalculator.calculateInvestmentMetrics({
        propertyPrice: params.propertyPrice,
        downPaymentPercent: params.downPaymentPercent,
        loanFee: 0,
        schedule: standard.schedule,
        holdingYears: params.holdingPeriod,
        appreciationRate: params.appreciationRate,
        sellingCostRate: params.sellingCostRate,
        rentalIncome: params.rentalEnabled ? {
          grossRent: params.grossRent,
          taxRate: params.taxRate,
          vacancyRate: 0.05,
          operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees
        } : null
      });

      if (metrics) {
        this.chartManager.createEquityChart('equityChart', metrics);
      }
    }

    // Cashflow charts need the rental data
    if (standard && params.rentalEnabled) {
      const rentalConfig = {
        grossRent: params.grossRent,
        taxRate: params.taxRate,
        vacancyRate: 0.05,
        operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees,
        indexed: params.indexRent,
        annualInflationRate: params.annualInflationRate // Use loan inflation as proxy
      };

      this.chartManager.createCashflowChart('cashflowChart', standard, rentalConfig, params.applyRentToLoan);

      // Ensure container is visible
      document.getElementById('cashflowChartContainer')?.classList.remove('hidden');
    } else {
      document.getElementById('cashflowChartContainer')?.classList.add('hidden');
    }
  }

  updateInvestmentDashboard(params) {
    const standard = this.scheduleData.standard;
    if (!standard) return;

    const metrics = LoanCalculator.calculateInvestmentMetrics({
      propertyPrice: params.propertyPrice,
      downPaymentPercent: params.downPaymentPercent,
      loanFee: 0,
      schedule: standard.schedule,
      holdingYears: params.holdingPeriod,
      appreciationRate: params.appreciationRate,
      sellingCostRate: params.sellingCostRate,
      rentalIncome: params.rentalEnabled ? {
        grossRent: params.grossRent,
        taxRate: params.taxRate,
        vacancyRate: 0.05,
        operatingCosts: params.propertyTax + params.insurance + params.maintenance + params.hoaFees
      } : null
    });

    if (!metrics) return;

    const mapping = {
      'invFutureValue': metrics.futurePropertyValue,
      'invEquityGain': metrics.equityAtSale,
      'invCoC': `${metrics.cashOnCashReturn.toFixed(1)}%`,
      'invTotalProfit': metrics.totalProfit,
      'invYearsLabel1': params.holdingPeriod
    };

    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        if (typeof val === 'number' && id !== 'invYearsLabel1') {
          el.textContent = Utils.formatISK(val, false);
        } else {
          el.textContent = val;
        }
      }
    });

    this.updateInvestmentTimeline(standard.schedule, params);
    this.updateEquityBuildingBars(metrics, params);
  }

  updateInvestmentTimeline(schedule, params) {
    const container = document.getElementById('investmentTimeline');
    if (!container) return;

    const milestones = [1, 3, 5, 10]; // Years
    // Ensure we don't go beyond term
    const actualMilestones = milestones.filter(y => y <= params.loanTermYears || y === 10);

    let html = `<div class="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 rounded-full"></div>
                <div class="flex justify-between relative z-10">`;

    actualMilestones.forEach(year => {
      const monthIndex = Math.min(year * 12 - 1, schedule.length - 1);
      const row = schedule[monthIndex];
      const propertyValue = params.propertyPrice * Math.pow(1 + params.appreciationRate / 100, year);
      const equity = propertyValue - row.balance;

      html += `
                <div class="text-center group min-w-[60px]">
                    <div class="w-3 h-3 ${year <= params.holdingPeriod ? 'bg-brand-neon' : 'bg-slate-700'} rounded-full mx-auto mb-2 border-2 border-slate-900 group-hover:scale-150 transition-transform"></div>
                    <span class="block text-[10px] text-slate-400 font-bold uppercase">Ár ${year}</span>
                    <div class="hidden group-hover:block absolute top-10 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded border border-slate-700 z-20 w-32 shadow-xl">
                        <p class="text-[9px] text-slate-500 uppercase">Eign: ${Utils.formatISK(propertyValue, false)}</p>
                        <p class="text-[9px] text-brand-neon uppercase font-bold">Eigið fé: ${Utils.formatISK(equity, false)}</p>
                    </div>
                </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  updateEquityBuildingBars(metrics, params) {
    const downPayment = params.propertyPrice * (params.downPaymentPercent / 100);
    const totalEquity = metrics.equityAtSale + (params.propertyPrice * (params.downPaymentPercent / 100)); // total value gain + initial

    // We want to show how much is initial vs paydown vs appreciation
    const standard = this.scheduleData.standard;
    const endBalance = metrics.loanBalanceAtSale;
    const startLoan = params.loanAmount;
    const principalPaydown = startLoan - endBalance;
    const appreciation = metrics.futurePropertyValue - params.propertyPrice;

    const totalGain = downPayment + principalPaydown + appreciation;

    const bars = [
      { id: 'barDownPayment', label: 'labelDownPayment', val: downPayment },
      { id: 'barPrincipalPaydown', label: 'labelPrincipalPaydown', val: principalPaydown },
      { id: 'barAppreciation', label: 'labelAppreciation', val: appreciation }
    ];

    bars.forEach(bar => {
      const barEl = document.getElementById(bar.id);
      const labelEl = document.getElementById(bar.label);
      if (barEl) barEl.style.width = `${(bar.val / totalGain) * 100}%`;
      if (labelEl) labelEl.textContent = Utils.formatISK(bar.val, false);
    });
  }

  saveScenario() {
    const name = document.getElementById('scenarioName')?.value || 'Ný forsenda';
    const params = this.getParams();
    this.scenarioManager.add(name, params);
    this.renderScenarios();
    if (document.getElementById('scenarioName')) document.getElementById('scenarioName').value = '';
  }

  renderScenarios() {
    const container = document.getElementById('savedScenarios');
    if (!container) return;

    const scenarios = this.scenarioManager.getAll();
    if (scenarios.length === 0) {
      container.innerHTML = '<p class="text-[10px] text-slate-500 italic">Engar vistaðar forsendur</p>';
      return;
    }

    container.innerHTML = scenarios.map((s, i) => `
            <div class="flex justify-between items-center p-2 bg-white/5 rounded hover:bg-white/10 transition group">
                <button class="text-[11px] text-slate-300 hover:text-white truncate flex-1 text-left" onclick="window.dashboardApp.loadScenario(${i})">
                    ${s.name}
                </button>
                <button class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-1" onclick="window.dashboardApp.deleteScenario(${i})">×</button>
            </div>
        `).join('');
  }

  loadScenario(index) {
    const scenario = this.scenarioManager.get(index);
    if (!scenario) return;

    const p = scenario.params;

    // Populate inputs
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val;

        // Trigger slider sync
        const slider = document.getElementById(id + 'Slider');
        if (slider) slider.value = val;
      }
    };

    setVal('loanType', p.loanType);
    setVal('propertyPrice', p.propertyPrice);
    setVal('downPaymentPercent', p.downPaymentPercent);
    setVal('interestRate', p.annualInterestRate * 100);
    setVal('inflationRate', p.annualInflationRate * 100);
    setVal('loanTerm', p.loanTermYears);

    setVal('enableRental', p.rentalEnabled);
    setVal('applyRentToLoan', p.applyRentToLoan);
    setVal('monthlyRent', p.grossRent);
    setVal('indexRent', p.indexRent);
    setVal('incomeTaxRate', p.taxRate * 100);
    setVal('propertyTax', p.propertyTax);
    setVal('insurance', p.insurance);
    setVal('maintenance', p.maintenance);
    setVal('hoaFees', p.hoaFees);

    setVal('appreciationRate', p.appreciationRate * 100);
    setVal('holdingPeriod', p.holdingPeriod);
    setVal('sellingCosts', p.sellingCostRate * 100);

    // UI state specific toggles
    this.handleRentalToggle({ target: { checked: p.rentalEnabled } });
    this.updateLoanAmount();
    this.calculate();
  }

  deleteScenario(index) {
    this.scenarioManager.remove(index);
    this.renderScenarios();
  }

  // Legacy method for dashboard-logic.js integration
  prefillCalculator(amount) {
    const propFormatted = document.getElementById('propertyPriceFormatted');
    const propHidden = document.getElementById('propertyPrice');
    const propSlider = document.getElementById('propertyPriceSlider');

    if (propHidden) {
      propHidden.value = amount;
      if (propFormatted) propFormatted.value = parseInt(amount).toLocaleString('is-IS');
      if (propSlider) propSlider.value = amount;
      this.updateLoanAmount();
      this.calculate();
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardApp = new DashboardCalculatorApp();
  window.dashboardApp.renderScenarios();
});
