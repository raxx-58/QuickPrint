document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modals = {
        signup: document.getElementById('modal-signup'),
        payment: document.getElementById('modal-payment'),
        scanPay: document.getElementById('modal-scan-pay'),
        upload: document.getElementById('modal-upload'),
        connect: document.getElementById('modal-connect')
    };

    const btns = {
        scan: document.getElementById('btn-scan-qr'),
        signup: document.getElementById('form-signup'), // Form
        payDetails: document.getElementById('btn-pay-details'),
        upload: document.getElementById('btn-upload')
    };

    const inputs = {
        copies: document.getElementById('pay-copies'),
        color: document.getElementById('pay-color'),
        file: document.getElementById('file-input')
    };

    let currentJob = {
        copies: 1,
        color: false,
        file: null,
        id: null,
        accessCode: null
    };

    // Close modals
    document.querySelectorAll('.close-modal').forEach(el => {
        el.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.remove('active');
        });
    });

    // 1. Scan QR -> Sign Up
    btns.scan.addEventListener('click', () => {
        // Simulate Scan Delay
        btns.scan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        setTimeout(() => {
            btns.scan.innerHTML = '<i class="fas fa-qrcode"></i> Scan QR Code';
            openModal('signup');
        }, 1000);
    });

    // 2. Sign Up -> Payment
    btns.signup.addEventListener('submit', (e) => {
        e.preventDefault();
        // In a real app, we'd auth here. For now, just advance.
        closeModal('signup');
        openModal('payment');
    });

    // 3. Pay -> Upload
    // 3. Select Plan -> Scan QR (Payment)
    btns.payDetails.addEventListener('click', () => {
        // Capture choices
        currentJob.copies = inputs.copies.value;
        currentJob.color = inputs.color.value === 'true';

        closeModal('payment');
        openModal('scanPay');
        startScanner();
    });

    let stream = null;

    function startScanner() {
        const video = document.getElementById('qr-video');
        const status = document.getElementById('scan-status');
        
        status.innerText = 'Initializing camera...';

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then((s) => {
                    stream = s;
                    video.srcObject = stream;
                    video.play();
                    status.innerText = 'Scanning...';

                    // Simulate Scan Success + Payment Processing
                    setTimeout(() => {
                        handleScanSuccess();
                    }, 3000);
                })
                .catch((err) => {
                    console.error(err);
                    status.innerText = 'Camera access denied or unavailable. Simulating scan...';
                    // Fallback for dev/no-camera
                    setTimeout(() => {
                        handleScanSuccess();
                    }, 2000);
                });
        } else {
            status.innerText = 'Camera API not supported. Simulating...';
            setTimeout(() => {
                handleScanSuccess();
            }, 2000);
        }
    }

    function stopScanner() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    function handleScanSuccess() {
        const status = document.getElementById('scan-status');
        status.innerHTML = '<i class="fas fa-check-circle" style="color: #10B981;"></i> QR Code Scanned!';
        
        // Stop Camera
        stopScanner();

        // Simulate Payment Processing
        setTimeout(() => {
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';
            setTimeout(() => {
                closeModal('scanPay');
                openModal('upload');
            }, 1500);
        }, 1000);
    }

    // File Drop Zone Logic
    const dropZone = document.getElementById('drop-zone');

    dropZone.addEventListener('click', () => inputs.file.click());

    inputs.file.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (file) {
            currentJob.file = file;
            dropZone.innerHTML = `<i class="fas fa-file-alt" style="font-size: 3rem; color: #D4AF37;"></i><p>Selected: <strong>${file.name}</strong></p>`;
            btns.upload.disabled = false;
        }
    }

    // 4. Upload -> Connect
    btns.upload.addEventListener('click', async () => {
        if (!currentJob.file) return;

        btns.upload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const formData = new FormData();
        formData.append('file', currentJob.file);
        formData.append('copies', currentJob.copies);
        formData.append('is_color', currentJob.color);

        try {
            // Upload Document
            const uploadRes = await fetch('/api/upload/', {
                method: 'POST',
                headers: { 'X-CSRFToken': CSRF_TOKEN },
                body: formData
            });

            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                currentJob.id = uploadData.job_id;

                // Process Payment (Mock) to get Access Code
                const payRes = await fetch('/api/payment/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': CSRF_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `job_id=${currentJob.id}`
                });

                const payData = await payRes.json();

                if (payData.success) {
                    currentJob.accessCode = payData.access_code;
                    document.getElementById('access-code-display').innerText = currentJob.accessCode;

                    closeModal('upload');
                    openModal('connect');

                    // Start Polling Status
                    pollStatus(currentJob.accessCode);
                } else {
                    alert('Payment processing failed');
                }
            } else {
                alert('Upload failed: ' + uploadData.error);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            btns.upload.innerHTML = 'Upload & Process';
        }
    });

    function openModal(name) {
        modals[name].classList.add('active');
    }

    function closeModal(name) {
        modals[name].classList.remove('active');
    }

    function pollStatus(code) {
        const statusBadge = document.getElementById('job-status');
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/status/${code}/`);
                const data = await res.json();

                if (data.status === 'PRINTING') {
                    statusBadge.innerText = 'Printing...';
                    statusBadge.classList.add('printing');
                } else if (data.status === 'COMPLETED') {
                    statusBadge.innerText = 'Completed';
                    statusBadge.classList.remove('printing');
                    document.getElementById('connection-step-1').classList.add('hidden');
                    document.getElementById('connection-step-2').classList.remove('hidden');
                    clearInterval(interval);
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        }, 2000);
    }
});
