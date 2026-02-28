const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynkkm6KEZ7kkCtZz4Sv-mxwTeP-Lg8uBjjIeoWdqSpdBbUMe965kcVOPgjQrya7EXA/exec';

document.addEventListener('DOMContentLoaded', () => {

    // Multi-step State
    let currentStep = 1;
    const totalSteps = 4;
    const track = document.getElementById('carousel-track');
    const progressFill = document.getElementById('progress-fill');
    const stepIndicator = document.getElementById('step-indicator');

    // Cached Quote Data (From Step 1 constraints)
    let cachedQuoteTotal = 0;

    // Step Elements
    const stepLabels = ['Availability', 'Event Details', 'Add-ons', 'Summary'];
    const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3'),
        document.getElementById('step-4')
    ];

    // Navigation Buttons
    const btnCheck = document.getElementById('btn-check'); // Step 1 Checks DB
    const btnNext1 = document.getElementById('btn-next-1'); // Step 1 -> 2
    const btnNext2 = document.getElementById('btn-next-2'); // Step 2 -> 3
    const btnNext3 = document.getElementById('btn-next-3'); // Step 3 -> 4
    const btnSubmit = document.getElementById('btn-submit'); // Step 4
    const btnPrevs = document.querySelectorAll('.btn-prev');
    const btnReset = document.getElementById('reset-btn');

    const form = document.getElementById('booking-form');
    const loading = document.getElementById('loading');
    const availabilityStatus = document.getElementById('availability-status');
    const successPanel = document.getElementById('success-panel');

    // Modal Elements
    const modal = document.getElementById('image-modal');
    const modalImg = document.querySelector('.modal-image');
    const btnOpenModal1 = document.getElementById('open-waiver-modal');
    const btnOpenModal2 = document.getElementById('open-waiver-btn');
    const btnOpenQR = document.getElementById('open-qr-modal');
    const btnCloseModal = document.getElementById('close-modal');

    // Helper: Update Carousel Position
    function updateCarousel() {
        const offset = (currentStep - 1) * 100 * -1;
        track.style.transform = `translateX(${offset}%)`;

        // Update Indicator
        progressFill.style.width = `${(currentStep / totalSteps) * 100}%`;
        stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}: ${stepLabels[currentStep - 1]}`;

        // Handle Visibility for Focus/Accessibility
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Always scroll to top of form when changing steps
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Helper: Basic Field Validation for current step
    function validateStep(stepNum) {
        const currentStepEl = document.getElementById(`step-${stepNum}`);
        const inputs = currentStepEl.querySelectorAll('input:required');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });

        // Custom validation for quantities on step 1
        if (stepNum === 1 && isValid) {
            const tables = parseInt(document.getElementById('qty-tables').value) || 0;
            const chairs = parseInt(document.getElementById('qty-chairs').value) || 0;
            if (tables === 0 && chairs === 0) {
                showStatus('Please select at least one item.', 'error');
                isValid = false;
            }
        }

        // Custom validation for Radio buttons on step 2 & 3
        if (isValid && (stepNum === 2 || stepNum === 3)) {
            const radioGroups = currentStepEl.querySelectorAll('.radio-group');
            radioGroups.forEach(group => {
                const radios = group.querySelectorAll('input[type="radio"]:required');
                if (radios.length > 0) {
                    const name = radios[0].name;
                    const checked = document.querySelector(`input[name="${name}"]:checked`);
                    if (!checked) {
                        radios[0].setCustomValidity('Please select an option.');
                        radios[0].reportValidity();
                        isValid = false;
                    } else {
                        radios[0].setCustomValidity(''); // clear
                    }
                }
            });
        }

        return isValid;
    }

    // Helper: Status Message
    function showStatus(message, type) {
        availabilityStatus.textContent = message;
        availabilityStatus.classList.remove('hidden', 'status-error', 'status-success');
        availabilityStatus.classList.add(`status-${type}`);
    }

    function hideStatus() {
        availabilityStatus.classList.add('hidden');
    }

    // --- STEP 1: Check Availability ---
    btnCheck.addEventListener('click', async () => {
        hideStatus();
        if (!validateStep(1)) return;

        const date = document.getElementById('date-picker').value;
        const tables = document.getElementById('qty-tables').value;
        const chairs = document.getElementById('qty-chairs').value;

        btnCheck.disabled = true;
        btnCheck.textContent = 'Checking...';
        loading.classList.remove('hidden');

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'check_availability',
                    date: date,
                    tables: tables, // ensure numbers
                    chairs: chairs
                })
            });

            const result = await response.json();

            if (result.status === 'success' && result.data.available) {
                // Save the base quote
                cachedQuoteTotal = result.data.quote.total_price;
                document.getElementById('step1-total').textContent = `$${cachedQuoteTotal.toFixed(2)}`;
                document.getElementById('step1-quote').classList.remove('hidden');

                // Swap buttons to let user manually continue
                btnCheck.classList.add('hidden');
                btnNext1.classList.remove('hidden');
            } else {
                let errorMsg = 'Selected items are not available on this date.';
                if (result.message) {
                    errorMsg = result.message;
                } else if (result.data && result.data.issues && result.data.issues.length > 0) {
                    errorMsg = `Not enough inventory: ${result.data.issues.join(', ')}`;
                }
                showStatus(errorMsg, 'error');
            }
        } catch (error) {
            showStatus(`Client Error: ${error.message} (Check console for details)`, 'error');
            console.error(error);
        } finally {
            btnCheck.disabled = false;
            btnCheck.textContent = 'Check Availability';
            loading.classList.add('hidden');
        }
    });

    // --- STEP 1 -> STEP 2 (Manual Continue) ---
    btnNext1.addEventListener('click', () => {
        currentStep = 2;
        updateCarousel();
    });

    // --- STEP 2: Event Details -> Step 3 ---
    btnNext2.addEventListener('click', () => {
        if (!validateStep(2)) return;
        currentStep = 3;
        updateCarousel();
    });

    // --- STEP 3: Add-ons -> Step 4 (Quote Build) ---
    btnNext3.addEventListener('click', () => {
        if (!validateStep(3)) return;

        // Calculate Add-ons
        const setupOption = document.querySelector('input[name="setup-option"]:checked');
        const setupFee = parseFloat(setupOption.dataset.cost || 0);

        const finalTotal = cachedQuoteTotal + setupFee;
        const finalDeposit = finalTotal * 0.50;

        // Update Step 4 DOM
        document.getElementById('final-base').textContent = `$${cachedQuoteTotal.toFixed(2)}`;
        document.getElementById('final-fees').textContent = `$${setupFee.toFixed(2)}`;
        document.getElementById('final-total').textContent = `$${finalTotal.toFixed(2)}`;
        document.getElementById('final-deposit').textContent = `$${finalDeposit.toFixed(2)}`;

        currentStep = 4;
        updateCarousel();
    });

    // --- PREVIOUS BUTTONS ---
    btnPrevs.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateCarousel();
            }
        });
    });

    // --- STEP 4: Final Booking Submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Final sanity validation
        if (!validateStep(4)) return;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Submitting...';
        loading.classList.remove('hidden');

        // Gather the massive payload
        const payload = {
            action: 'book',
            // Step 1
            date: document.getElementById('date-picker').value,
            tables: document.getElementById('qty-tables').value,
            chairs: document.getElementById('qty-chairs').value,
            // Step 2
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            time: document.getElementById('event-time').value,
            addressType: document.querySelector('input[name="address-type"]:checked').value,
            address: document.getElementById('dropoff-address').value,
            // Step 3
            setupOption: document.querySelector('input[name="setup-option"]:checked').value,
            agreeTrash: document.querySelector('input[name="agree-trash"]').checked,
            agreeFolding: document.querySelector('input[name="agree-folding"]').checked,
            // Step 4
            agreeWaiver: document.querySelector('input[name="agree-waiver"]').checked,
            signature: document.getElementById('e-signature').value
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                form.classList.add('hidden');
                successPanel.classList.remove('hidden');

                document.getElementById('success-id').textContent = result.data.booking_id;
                document.getElementById('success-date').textContent = payload.date;
                document.getElementById('success-deposit').textContent = document.getElementById('final-deposit').textContent;
            } else {
                alert('Error processing booking: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            alert('Error communicating with the server. Please try again.');
            console.error(error);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirm Booking';
            loading.classList.add('hidden');
        }
    });

    // --- Quantity Buttons (+/-) Logic ---
    const plusBtns = document.querySelectorAll('.qty-btn.plus');
    const minusBtns = document.querySelectorAll('.qty-btn.minus');

    plusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = `qty-${btn.dataset.target}`;
            const input = document.getElementById(targetId);
            input.value = parseInt(input.value) + 1;
        });
    });

    minusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = `qty-${btn.dataset.target}`;
            const input = document.getElementById(targetId);
            if (parseInt(input.value) > 0) {
                input.value = parseInt(input.value) - 1;
            }
        });
    });

    // Reset Flow
    btnReset.addEventListener('click', () => {
        form.reset();
        cachedQuoteTotal = 0;
        document.getElementById('step1-quote').classList.add('hidden');
        btnCheck.classList.remove('hidden');
        btnNext1.classList.add('hidden');
        successPanel.classList.add('hidden');
        form.classList.remove('hidden');
        currentStep = 1;
        updateCarousel();
    });

    // --- Image Modal Logic ---
    function openModal(imgSrc) {
        modalImg.src = imgSrc;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    btnOpenModal1.addEventListener('click', () => openModal('waiver.png'));
    btnOpenModal2.addEventListener('click', () => openModal('waiver.png'));
    if (btnOpenQR) btnOpenQR.addEventListener('click', () => openModal('qrcode.jpg'));
    btnCloseModal.addEventListener('click', closeModal);

    // Close modal if clicking outside the image
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Initial setup
    updateCarousel();
});
