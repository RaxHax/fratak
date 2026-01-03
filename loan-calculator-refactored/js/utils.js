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
        
        if (years === 0) return `${remainingMonths} mán.`;
        if (remainingMonths === 0) return `${years} ár`;
        return `${years} ár ${remainingMonths} mán.`;
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
            headers = ['Mánuður', 'Gjalddagi', 'Verðbætur', 'Afborgun', 'Vextir', 'Kostnaður', 'Heildargreiðsla', 'Eftirstöðvar'],
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
            errors.push('Kaupverð eignar verður að vera stærra en 0');
        }
        if (!params.loanAmount || params.loanAmount <= 0) {
            errors.push('Lánsfjárhæð verður að vera stærri en 0');
        }
        if (!params.annualInterestRate || params.annualInterestRate <= 0) {
            errors.push('Vextir verða að vera stærri en 0');
        }
        if (!params.loanTermYears || params.loanTermYears <= 0) {
            errors.push('Lánstími verður að vera stærri en 0');
        }

        // Warnings
        if (params.annualInterestRate > 0.20) {
            warnings.push('Vextir eru óvenju háir (>20%)');
        }
        if (params.loanTermYears > 40) {
            warnings.push('Lánstími er óvenju langur (>40 ár)');
        }
        if (params.downPaymentPercent < 10) {
            warnings.push('Útborgun er undir 10% - gæti þurft sérstakt samþykki');
        }
        if (params.loanAmount > params.propertyPrice * 0.95) {
            warnings.push('Lánshlutfall (LTV) er yfir 95%');
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
