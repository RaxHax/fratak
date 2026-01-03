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
