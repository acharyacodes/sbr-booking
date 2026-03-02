const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynkkm6KEZ7kkCtZz4Sv-mxwTeP-Lg8uBjjIeoWdqSpdBbUMe965kcVOPgjQrya7EXA/exec';

document.addEventListener('DOMContentLoaded', () => {

    // Multi-step State
    let currentStep = 1;
    const totalSteps = 5;
    const track = document.getElementById('carousel-track');
    const progressFill = document.getElementById('progress-fill');
    const stepIndicator = document.getElementById('step-indicator');

    // Cached Quote Data (From Step 1 constraints)
    let cachedQuoteTotal = 0;

    // Step Elements
    const stepLabels = ['Service Type', 'Availability', 'Event Details', 'Add-ons', 'Summary'];
    const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3'),
        document.getElementById('step-4'),
        document.getElementById('step-5')
    ];

    // Navigation Buttons
    const btnCheck = document.getElementById('btn-check');
    const btnNextService = document.getElementById('btn-next-service');
    const btnNextAvail = document.getElementById('btn-next-avail');
    const btnNextDetails = document.getElementById('btn-next-details');
    const btnNextAddons = document.getElementById('btn-next-addons');
    const btnSubmit = document.getElementById('btn-submit');
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
            // Trim whitespace for standard inputs
            if (input.type === 'text' || input.type === 'tel') {
                input.value = input.value.trim();
            }

            if (!input.checkValidity()) {
                if (input.validity.patternMismatch) {
                    input.setCustomValidity(input.title); // Use our custom regex mismatch title
                } else if (input.validity.valueMissing) {
                    input.setCustomValidity('This field is required.');
                } else {
                    input.setCustomValidity(''); // Reset to default
                }

                input.reportValidity();
                isValid = false;
            } else {
                input.setCustomValidity('');
            }
        });

        // Custom validation for quantities on step 2
        if (stepNum === 2 && isValid) {
            const tables = parseInt(document.getElementById('qty-tables').value) || 0;
            const chairs = parseInt(document.getElementById('qty-chairs').value) || 0;
            if (tables === 0 && chairs === 0) {
                showStatus('Please select at least one item.', 'error');
                isValid = false;
            }
        }

        // Custom validation for Radio buttons on step 1, 3 & 4
        if (isValid && (stepNum === 1 || stepNum === 3 || stepNum === 4)) {
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

    // --- STEP 1: Service Type -> Step 2 ---
    btnNextService.addEventListener('click', () => {
        if (!validateStep(1)) return;

        const serviceType = document.querySelector('input[name="service-type"]:checked').value;
        const addressContainer = document.getElementById('address-container');
        const pickupNotice = document.getElementById('pickup-notice');
        const addrRadios = document.querySelectorAll('input[name="address-type"]');
        const addrInput = document.getElementById('dropoff-address');
        const setupContainer = document.getElementById('setup-opts-container');
        const setupRadios = document.querySelectorAll('input[name="setup-option"]');

        if (serviceType === 'pickup') {
            addressContainer.classList.add('hidden');
            pickupNotice.classList.remove('hidden');
            addrRadios.forEach(r => r.required = false);
            addrInput.required = false;

            setupContainer.classList.add('hidden');
            setupRadios.forEach(r => {
                r.required = false;
                if (r.value === '0-none') r.checked = true;
            });
        } else {
            addressContainer.classList.remove('hidden');
            pickupNotice.classList.add('hidden');
            addrRadios.forEach(r => r.required = true);
            addrInput.required = true;

            setupContainer.classList.remove('hidden');
            setupRadios.forEach(r => r.required = true);
        }

        currentStep = 2;
        updateCarousel();
    });

    // --- STEP 2: Check Availability ---
    btnCheck.addEventListener('click', async () => {
        hideStatus();
        if (!validateStep(2)) return;

        const pDate = document.getElementById('pickup-date').value;
        const pTime = document.getElementById('pickup-time').value;
        const dDate = document.getElementById('dropoff-date').value;
        const dTime = document.getElementById('dropoff-time').value;
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
                    startDate: pDate,
                    startTime: pTime,
                    endDate: dDate,
                    endTime: dTime,
                    tables: tables,
                    chairs: chairs
                })
            });

            const result = await response.json();

            if (result.status === 'success' && result.data.available) {
                cachedQuoteTotal = result.data.quote.total_price;
                document.getElementById('step2-total').textContent = `$${cachedQuoteTotal.toFixed(2)}`;
                document.getElementById('step2-quote').classList.remove('hidden');

                btnCheck.parentElement.classList.add('hidden');
                document.getElementById('btn-next-avail-group').classList.remove('hidden');
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

    // --- STEP 2 -> STEP 3 ---
    btnNextAvail.addEventListener('click', () => {
        currentStep = 3;
        updateCarousel();
    });

    // --- STEP 3 -> STEP 4 ---
    btnNextDetails.addEventListener('click', () => {
        if (!validateStep(3)) return;
        currentStep = 4;
        updateCarousel();
    });

    // --- STEP 4 -> STEP 5 (Quote Build) ---
    btnNextAddons.addEventListener('click', () => {
        if (!validateStep(4)) return;

        const setupOption = document.querySelector('input[name="setup-option"]:checked');
        const setupFee = setupOption ? parseFloat(setupOption.dataset.cost || 0) : 0;

        const finalTotal = cachedQuoteTotal + setupFee;
        const finalDeposit = finalTotal * 0.50;

        document.getElementById('final-base').textContent = `$${cachedQuoteTotal.toFixed(2)}`;
        document.getElementById('final-fees').textContent = `$${setupFee.toFixed(2)}`;
        document.getElementById('final-total').textContent = `$${finalTotal.toFixed(2)}`;
        document.getElementById('final-deposit').textContent = `$${finalDeposit.toFixed(2)}`;

        const serviceType = document.querySelector('input[name="service-type"]:checked').value;
        const step5PickupNotice = document.getElementById('step5-pickup-notice');
        if (serviceType === 'pickup') {
            step5PickupNotice.classList.remove('hidden');
            document.getElementById('step5-pickup-time').textContent = document.getElementById('pickup-time').value;
        } else {
            step5PickupNotice.classList.add('hidden');
        }

        currentStep = 5;
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

    // --- STEP 5: Final Booking Submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Final sanity validation
        if (!validateStep(5)) return;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Submitting...';
        loading.classList.remove('hidden');

        const serviceType = document.querySelector('input[name="service-type"]:checked').value;
        const addressTypeEl = document.querySelector('input[name="address-type"]:checked');

        const payload = {
            action: 'book',
            serviceType: serviceType,
            startDate: document.getElementById('pickup-date').value,
            startTime: document.getElementById('pickup-time').value,
            endDate: document.getElementById('dropoff-date').value,
            endTime: document.getElementById('dropoff-time').value,
            tables: document.getElementById('qty-tables').value,
            chairs: document.getElementById('qty-chairs').value,
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            addressType: addressTypeEl ? addressTypeEl.value : 'N/A',
            address: document.getElementById('dropoff-address').value || 'Self Pickup',
            setupOption: document.querySelector('input[name="setup-option"]:checked').value,
            agreeTrash: document.querySelector('input[name="agree-trash"]').checked,
            agreeFolding: document.querySelector('input[name="agree-folding"]').checked,
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
                document.getElementById('success-date').textContent = `${payload.startDate} to ${payload.endDate}`;
                document.getElementById('success-deposit').textContent = document.getElementById('final-deposit').textContent;

                const addressContainer = document.getElementById('success-address-container');
                if (payload.serviceType === 'pickup') {
                    addressContainer.classList.remove('hidden');
                    document.getElementById('success-pickup-time').textContent = payload.startTime;
                } else {
                    addressContainer.classList.add('hidden');
                }
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

    // --- Form field formatting & sanitization ---
    const phoneInput = document.getElementById('customer-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }

    // Reset Flow
    btnReset.addEventListener('click', () => {
        form.reset();
        cachedQuoteTotal = 0;
        document.getElementById('step2-quote').classList.add('hidden');
        btnCheck.parentElement.classList.remove('hidden');
        document.getElementById('btn-next-avail-group').classList.add('hidden');
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

// --- Google Places API Autocomplete ---
// This function is called automatically once the Google Maps script loads
window.initAutocomplete = function () {
    const addressInput = document.getElementById('dropoff-address');
    if (addressInput) {
        // Initialize autocomplete and restrict it to geographical addresses in the US
        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
            types: ['address'],
            componentRestrictions: { country: 'us' }
        });

        // Prevent form submission if the user presses "Enter" specifically on the dropdown
        addressInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
};
