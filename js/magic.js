document.addEventListener('DOMContentLoaded', () => {
    // Magic Card Effect
    const cards = document.querySelectorAll('.magic-card');
    cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // Initialize Number Tickers
    const tickers = document.querySelectorAll('.number-ticker');
    tickers.forEach(el => new NumberTicker(el));
});

class NumberTicker {
    constructor(element) {
        this.element = element;
        this.value = parseInt(element.textContent.replace(/[^0-9-]/g, '')) || 0;
        this.targetValue = this.value; // Will be set externally or via data attribute

        // If data-value exists, animate to it immediately
        if (element.dataset.value) {
            this.update(parseInt(element.dataset.value));
        }

        // Observe changes if needed, or expose update method
        element.numberTicker = this;
    }

    update(newValue) {
        const start = this.value;
        const end = newValue;
        const duration = 1500; // ms
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            this.value = Math.floor(start + (end - start) * ease);
            this.element.textContent = this.value.toLocaleString('is-IS');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.value = end;
                this.element.textContent = this.value.toLocaleString('is-IS');
            }
        };

        requestAnimationFrame(animate);
    }
}

// Global helper to update tickers
window.updateNumberTicker = (id, value) => {
    const el = document.getElementById(id);
    if (el && el.numberTicker) {
        el.numberTicker.update(value);
    } else if (el) {
        // Fallback if not initialized
        el.textContent = value.toLocaleString('is-IS');
    }
};
