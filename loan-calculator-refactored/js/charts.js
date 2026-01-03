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
                        label: 'Hefðbundin',
                        data: standardData,
                        borderColor: '#64748b',
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Óverðtryggt',
                        data: nonIndexedData,
                        borderColor: '#14b8a6',
                        backgroundColor: 'rgba(20, 184, 166, 0.1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Flýtiáætlun',
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
            options: this.getLineChartOptions('Ár', 'Eftirstöðvar')
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
        const labels = sampledData.map(r => `Ár ${Math.ceil(r.month / 12)}`);

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
                        label: 'Verðbætur',
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
        const labels = years.map(y => `Ár ${y.year}`);

        this.charts.equity = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Verðmæti eignar',
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
                        label: 'Eftirstöðvar láns',
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
                        label: 'Eigið fé',
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
            options: this.getLineChartOptions('Ár', 'ISK')
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
        const labels = ['Höfuðstóll', 'Vextir', 'Verðbætur', 'Gjöld'];
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
        const labels = Array.from({ length: years }, (_, i) => `Ár ${i + 1}`);

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
                        label: 'Nettó leigutekjur',
                        data: rentalIncomes,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Lánakostnaður',
                        data: mortgagePayments,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    },
                    {
                        type: 'line',
                        label: applyRentToLoan ? 'Úr vasa' : 'Nettó sjóðstreymi',
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
