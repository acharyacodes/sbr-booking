const API_URL = 'https://script.google.com/macros/s/AKfycbynkkm6KEZ7kkCtZz4Sv-mxwTeP-Lg8uBjjIeoWdqSpdBbUMe965kcVOPgjQrya7EXA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const qtyButtons = document.querySelectorAll('.qty-btn');
    const form = document.getElementById('availability-form');
    let currentQuote = null; // Store the quote for checkout

    // Panels
    const resultsPanel = document.getElementById('results-panel');
    const successPanel = document.getElementById('success-panel');
    const statusDiv = document.getElementById('availability-status');
    const quoteDetailsDiv = document.getElementById('quote-details');
    const loadingDiv = document.getElementById('loading');

    // Quote specific spans
    const quoteItemsDisplay = document.getElementById('quote-items');
    const quoteDiscountDisplay = document.getElementById('quote-discount');
    const quoteTotalDisplay = document.getElementById('quote-total');
    const discountRow = document.getElementById('discount-row');

    // Action buttons
    const checkBtn = document.getElementById('check-btn');
    const bookBtn = document.getElementById('book-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Disable past dates in date picker
    const datePicker = document.getElementById('date-picker');
    const today = new Date().toISOString().split('T')[0];
    datePicker.setAttribute('min', today);

    // --- Event Listeners ---

    // Quantity Plus/Minus buttons logic
    qtyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = `qty-${e.target.dataset.target}`;
            const input = document.getElementById(targetId);
            const isPlus = e.target.classList.contains('plus');

            let val = parseInt(input.value) || 0;
            if (isPlus) {
                val++;
            } else if (val > 0) {
                val--;
            }
            input.value = val;

            // Hide previous results if they change the quantities
            resultsPanel.classList.add('hidden');
        });
    });

    // Hide results if they change the date
    datePicker.addEventListener('change', () => {
        resultsPanel.classList.add('hidden');
    });

    // Handle "Check Availability"
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetDate = datePicker.value;
        const tablesReq = parseInt(document.getElementById('qty-tables').value) || 0;
        const chairsReq = parseInt(document.getElementById('qty-chairs').value) || 0;

        if (tablesReq === 0 && chairsReq === 0) {
            alert("Please select at least 1 table or chair to rent.");
            return;
        }

        // UI State
        checkBtn.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        resultsPanel.classList.add('hidden');
        statusDiv.className = '';
        statusDiv.innerHTML = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps script prefers this to avoid complex CORS preflights
                body: JSON.stringify({
                    action: 'check_availability',
                    date: targetDate,
                    tables: tablesReq,
                    chairs: chairsReq
                })
            });

            if (!response.ok) throw new Error('Failed to connect to server.');

            const data = await response.json();

            // Show Status
            resultsPanel.classList.remove('hidden');

            if (data.is_available) {
                statusDiv.className = 'status-msg status-success';
                statusDiv.innerHTML = '✨ Items Available!';

                // Show Quote details
                quoteDetailsDiv.classList.remove('hidden');
                quoteItemsDisplay.innerText = `${tablesReq} Tables, ${chairsReq} Chairs`;

                const quote = data.quote;
                currentQuote = quote; // save for booking

                if (quote.full_sets_applied >= 4) {
                    discountRow.classList.remove('hidden');
                    quoteDiscountDisplay.innerText = quote.discount_applied;
                } else {
                    discountRow.classList.add('hidden');
                }

                quoteTotalDisplay.innerText = `$${quote.total_price.toFixed(2)}`;

            } else {
                statusDiv.className = 'status-msg status-error';
                statusDiv.innerHTML = `⚠️ Not enough inventory.<br><small>We only have ${data.available_tables} tables and ${data.available_chairs} chairs left on this date.</small>`;
                quoteDetailsDiv.classList.add('hidden');
            }

        } catch (error) {
            alert("Error: " + error.message + "\nMake sure the Python backend is running!");
        } finally {
            checkBtn.classList.remove('hidden');
            loadingDiv.classList.add('hidden');
        }
    });

    // Handle "Confirm Booking"
    bookBtn.addEventListener('click', async () => {
        const customerName = document.getElementById('customer-name').value.trim();
        if (!customerName) {
            alert("Please enter your name to confirm the booking.");
            return;
        }

        const targetDate = datePicker.value;
        const tablesReq = parseInt(document.getElementById('qty-tables').value) || 0;
        const chairsReq = parseInt(document.getElementById('qty-chairs').value) || 0;

        bookBtn.disabled = true;
        bookBtn.innerText = 'Processing...';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'book',
                    date: targetDate,
                    customer_name: customerName,
                    tables: tablesReq,
                    chairs: chairsReq
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // E.g. someone booked the last items while they were typing their name
                throw new Error(data.detail || 'Booking failed');
            }

            // Success!
            form.classList.add('hidden');
            resultsPanel.classList.add('hidden');
            successPanel.classList.remove('hidden');

            document.getElementById('success-id').innerText = data.booking_id;
            // Format date nicely
            const dateObj = new Date(targetDate + 'T12:00:00'); // avoid timezone issues
            document.getElementById('success-date').innerText = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

        } catch (error) {
            alert(error.message);
        } finally {
            bookBtn.disabled = false;
            bookBtn.innerText = 'Confirm Booking';
        }
    });

    // Handle "Book Another Date" (Reset)
    resetBtn.addEventListener('click', () => {
        document.getElementById('qty-tables').value = 0;
        document.getElementById('qty-chairs').value = 0;
        document.getElementById('customer-name').value = '';
        datePicker.value = '';

        successPanel.classList.add('hidden');
        form.classList.remove('hidden');
    });
});
