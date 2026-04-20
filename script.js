document.addEventListener('DOMContentLoaded', () => {
    // State
    let invoiceHistory = JSON.parse(localStorage.getItem('rainbow_invoices')) || [];
    let items = [
        { id: generateId(), desc: '', qty: 1, price: 0.00 }
    ];

    // Elements - Editor
    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemTemplate = document.getElementById('item-template');
    
    const taxRateInput = document.getElementById('tax-rate');
    const discountTypeInput = document.getElementById('discount-type');
    const discountAmountInput = document.getElementById('discount-amount');
    const subtotalDisplay = document.getElementById('subtotal-display');
    const totalDisplay = document.getElementById('total-display');

    // Navigation Elements
    const newInvoiceBtn = document.getElementById('new-invoice-btn');
    const previewBtn = document.getElementById('preview-btn');
    const backBtn = document.getElementById('back-btn');
    const editorArea = document.getElementById('editor-area');
    const previewArea = document.getElementById('preview-area');
    const historyBtn = document.getElementById('history-btn');
    const backFromHistoryBtn = document.getElementById('back-from-history-btn');
    const historyArea = document.getElementById('history-area');
    const historyList = document.getElementById('history-list');

    // Action Elements
    const downloadBtn = document.getElementById('download-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const emailBtn = document.getElementById('email-btn');

    // Set default date to today
    document.getElementById('invoice-date').valueAsDate = new Date();

    // Initialize Items
    renderItems();
    calculateTotals();

    // Event Listeners
    addItemBtn.addEventListener('click', () => {
        items.push({ id: generateId(), desc: '', qty: 1, price: 0.00 });
        renderItems();
        calculateTotals();
    });

    taxRateInput.addEventListener('input', calculateTotals);
    discountAmountInput.addEventListener('input', calculateTotals);
    discountTypeInput.addEventListener('change', calculateTotals);

    // Navigation
    newInvoiceBtn.addEventListener('click', () => {
        let hasContent = items.length > 1 || items[0].desc !== '' || items[0].price > 0;
        if(hasContent) {
            if(!confirm("Start a new blank invoice? Any unsaved work will be lost.")) return;
        }
        
        items = [{ id: generateId(), desc: '', qty: 1, price: 0.00 }];
        renderItems();
        
        document.getElementById('client-name').value = '';
        document.getElementById('client-address').value = '';
        
        taxRateInput.value = 0;
        discountTypeInput.value = 'amount';
        discountAmountInput.value = 0;
        
        let nextInvNum = 1001;
        if(invoiceHistory.length > 0) {
            const maxInv = Math.max(...invoiceHistory.map(inv => parseInt(inv.vals.invoiceNumber) || 0));
            if(maxInv > 0) {
                nextInvNum = maxInv + 1;
            }
        }
        document.getElementById('invoice-number').value = nextInvNum;
        document.getElementById('invoice-date').valueAsDate = new Date();
        
        calculateTotals();
        
        historyArea.classList.remove('active');
        previewArea.classList.remove('active');
        editorArea.classList.add('active');
        window.scrollTo(0,0);
    });

    previewBtn.addEventListener('click', () => {
        syncPreview();
        editorArea.classList.remove('active');
        historyArea.classList.remove('active');
        previewArea.classList.add('active');
        window.scrollTo(0, 0);
    });

    backBtn.addEventListener('click', () => {
        previewArea.classList.remove('active');
        editorArea.classList.add('active');
        window.scrollTo(0, 0);
    });

    historyBtn.addEventListener('click', () => {
        renderHistory();
        editorArea.classList.remove('active');
        previewArea.classList.remove('active');
        historyArea.classList.add('active');
        window.scrollTo(0, 0);
    });

    backFromHistoryBtn.addEventListener('click', () => {
        historyArea.classList.remove('active');
        editorArea.classList.add('active');
        window.scrollTo(0, 0);
    });

    // Actions
    downloadBtn.addEventListener('click', generatePDF);
    whatsappBtn.addEventListener('click', shareWhatsApp);
    emailBtn.addEventListener('click', shareEmail);

    // Helpers
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function formatCurrency(amount) {
        return 'LKR ' + parseFloat(amount).toFixed(2);
    }

    function getFormValues() {
        return {
            companyName: document.getElementById('company-name').value || 'My Company',
            companyEmail: document.getElementById('company-email').value,
            clientName: document.getElementById('client-name').value || 'Client Name',
            clientAddress: document.getElementById('client-address').value,
            invoiceNumber: document.getElementById('invoice-number').value || '0001',
            invoiceDate: document.getElementById('invoice-date').value ? new Date(document.getElementById('invoice-date').value).toLocaleDateString() : new Date().toLocaleDateString(),
            invoiceDateRaw: document.getElementById('invoice-date').value,
            taxRate: parseFloat(taxRateInput.value) || 0,
            discountValue: parseFloat(discountAmountInput.value) || 0,
            discountType: discountTypeInput.value
        };
    }

    // Logic
    function renderItems() {
        itemsContainer.innerHTML = '';
        items.forEach((item, index) => {
            const clone = itemTemplate.content.cloneNode(true);
            const row = clone.querySelector('.item-row');
            
            const descInput = row.querySelector('.item-desc');
            const qtyInput = row.querySelector('.item-qty');
            const priceInput = row.querySelector('.item-price');
            const removeBtn = row.querySelector('.btn-remove-item');

            descInput.value = item.desc;
            qtyInput.value = item.qty;
            priceInput.value = item.price;

            // Update state on input
            descInput.addEventListener('input', (e) => {
                items[index].desc = e.target.value;
            });
            
            qtyInput.addEventListener('input', (e) => {
                items[index].qty = parseFloat(e.target.value) || 0;
                calculateTotals();
            });

            priceInput.addEventListener('input', (e) => {
                items[index].price = parseFloat(e.target.value) || 0;
                calculateTotals();
            });

            removeBtn.addEventListener('click', () => {
                if (items.length > 1) {
                    items.splice(index, 1);
                    renderItems();
                    calculateTotals();
                } else {
                    alert("Invoice must have at least one item.");
                }
            });

            itemsContainer.appendChild(row);
        });
    }

    function calculateTotals() {
        let subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
        let taxRate = parseFloat(taxRateInput.value) || 0;
        let discountVal = parseFloat(discountAmountInput.value) || 0;
        let discountType = discountTypeInput.value;
        let discountAmount = discountType === 'percent' ? subtotal * (discountVal / 100) : discountVal;

        let taxAmount = subtotal * (taxRate / 100);
        let total = subtotal + taxAmount - discountAmount;

        subtotalDisplay.textContent = formatCurrency(subtotal);
        totalDisplay.textContent = formatCurrency(total < 0 ? 0 : total);
    }

    function syncPreview() {
        const vals = getFormValues();

        // Header Info
        document.getElementById('display-company-name').textContent = vals.companyName;
        document.getElementById('display-company-email').textContent = vals.companyEmail;
        document.getElementById('display-invoice-number').textContent = vals.invoiceNumber;
        
        // Client Info
        document.getElementById('display-client-name').textContent = vals.clientName;
        document.getElementById('display-client-address').textContent = vals.clientAddress;
        document.getElementById('display-invoice-date').textContent = vals.invoiceDate;

        // Items
        const displayItems = document.getElementById('display-items');
        const invoiceRowTemplate = document.getElementById('invoice-row-template');
        displayItems.innerHTML = '';
        
        let subtotal = 0;

        items.forEach(item => {
            if (item.desc || item.price > 0) {
                const clone = invoiceRowTemplate.content.cloneNode(true);
                const cols = clone.querySelectorAll('td');
                const amt = item.qty * item.price;
                subtotal += amt;

                cols[0].textContent = item.desc || 'Item';
                cols[1].textContent = item.qty;
                cols[2].textContent = formatCurrency(item.price);
                cols[3].textContent = formatCurrency(amt);
                
                displayItems.appendChild(clone);
            }
        });

        // Totals
        const taxAmount = subtotal * (vals.taxRate / 100);
        const discountAmount = vals.discountType === 'percent' ? subtotal * (vals.discountValue / 100) : vals.discountValue;
        const total = subtotal + taxAmount - discountAmount;

        document.getElementById('display-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('display-total').textContent = formatCurrency(total < 0 ? 0 : total);

        const taxRow = document.getElementById('display-tax-row');
        if (vals.taxRate > 0) {
            taxRow.style.display = 'flex';
            document.getElementById('display-tax-rate').textContent = vals.taxRate;
            document.getElementById('display-tax-amount').textContent = formatCurrency(taxAmount);
        } else {
            taxRow.style.display = 'none';
        }

        const discountRow = document.getElementById('display-discount-row');
        if (discountAmount > 0) {
            discountRow.style.display = 'flex';
            discountRow.firstElementChild.textContent = vals.discountType === 'percent' ? `Discount (${vals.discountValue}%)` : 'Discount';
            document.getElementById('display-discount').textContent = '-' + formatCurrency(discountAmount);
        } else {
            discountRow.style.display = 'none';
        }
        
        saveToHistory(vals, total);
    }

    function generatePDF() {
        const invoiceElement = document.getElementById('invoice-template');
        const vals = getFormValues();

        const opt = {
            margin:       0,
            filename:     `Invoice_${vals.invoiceNumber}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Temporarily change button to indicate loading
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        downloadBtn.disabled = true;

        html2pdf().set(opt).from(invoiceElement).save().then(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }).catch((err) => {
            console.error("PDF Error:", err);
            alert("Failed to generate PDF. If you are opening this file directly from a folder, the browser blocked the logo due to strict security rules. Please use the Local Server method or upload to Netlify as previously described.");
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        });
    }

    function generateShareText() {
        const vals = getFormValues();
        let subtotal = 0;
        let itemsText = '';
        
        items.forEach(item => {
            if(item.desc || item.price > 0) {
                const amt = item.qty * item.price;
                subtotal += amt;
                itemsText += `- ${item.desc || 'Item'} (x${item.qty}) : ${formatCurrency(amt)}\n`;
            }
        });

        const taxAmount = subtotal * (vals.taxRate / 100);
        const discountAmount = vals.discountType === 'percent' ? subtotal * (vals.discountValue / 100) : vals.discountValue;
        const total = Math.max(0, subtotal + taxAmount - discountAmount);
        
        let text = `*INVOICE #${vals.invoiceNumber}*\n`;
        text += `From: ${vals.companyName}\n`;
        text += `To: ${vals.clientName}\n`;
        text += `Date: ${vals.invoiceDate}\n\n`;
        text += `*Items:*\n${itemsText}\n`;
        
        if (vals.taxRate > 0) text += `Tax: ${formatCurrency(taxAmount)}\n`;
        if (discountAmount > 0) {
            const label = vals.discountType === 'percent' ? `Discount (${vals.discountValue}%)` : `Discount`;
            text += `${label}: -${formatCurrency(discountAmount)}\n`;
        }
        
        text += `\n*TOTAL DUE: ${formatCurrency(total)}*\n\n`;
        text += `Thank you for your business!`;

        return encodeURIComponent(text);
    }

    async function shareWhatsApp() {
        const invoiceElement = document.getElementById('invoice-template');
        const vals = getFormValues();
        const filename = `Invoice_${vals.invoiceNumber}.pdf`;

        const opt = {
            margin:       0,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const originalText = whatsappBtn.innerHTML;
        whatsappBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        whatsappBtn.disabled = true;

        try {
            // Generate PDF as a blob file silently
            const pdfBlob = await html2pdf().set(opt).from(invoiceElement).output('blob');
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            // Check if Native Mobile Share Menu supports sharing files
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Invoice #${vals.invoiceNumber}`,
                    text: `Here is Invoice #${vals.invoiceNumber} from ${vals.companyName}.`
                });
            } else {
                // Fallback to text link if not on mobile/unsupported browser
                const text = generateShareText();
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        } catch (error) {
            console.error('Sharing failed:', error);
            // Fallback
            const text = generateShareText();
            window.open(`https://wa.me/?text=${text}`, '_blank');
        } finally {
            whatsappBtn.innerHTML = originalText;
            whatsappBtn.disabled = false;
        }
    }

    function shareEmail() {
        const text = generateShareText();
        const vals = getFormValues();
        const subject = encodeURIComponent(`Invoice #${vals.invoiceNumber} from ${vals.companyName}`);
        window.open(`mailto:?subject=${subject}&body=${text}`, '_blank');
    }

    // History Logic
    function saveToHistory(vals, total) {
        if (!vals.invoiceNumber) return;
        
        const invoiceData = {
            vals: vals,
            items: JSON.parse(JSON.stringify(items)),
            total: total,
            timestamp: new Date().getTime()
        };

        const existingIndex = invoiceHistory.findIndex(inv => inv.vals.invoiceNumber === vals.invoiceNumber);
        if (existingIndex >= 0) {
            invoiceHistory[existingIndex] = invoiceData;
        } else {
            invoiceHistory.push(invoiceData);
        }
        
        invoiceHistory.sort((a,b) => b.timestamp - a.timestamp);
        localStorage.setItem('rainbow_invoices', JSON.stringify(invoiceHistory));
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (invoiceHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>No saved invoices yet.</p>
                </div>
            `;
            return;
        }

        invoiceHistory.forEach((inv, index) => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-info">
                    <h3>#${inv.vals.invoiceNumber} - ${inv.vals.clientName}</h3>
                    <p><i class="fa-regular fa-calendar"></i> ${inv.vals.invoiceDate}</p>
                </div>
                <div class="history-actions">
                    <span class="history-total">${formatCurrency(inv.total)}</span>
                    <div class="history-action-btns">
                        <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="loadInvoice(${index})">Open</button>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; color: var(--danger); border-color: var(--danger);" onclick="deleteInvoice(${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            historyList.appendChild(card);
        });
    }

    window.loadInvoice = function(index) {
        const inv = invoiceHistory[index];
        if(!inv) return;
        
        document.getElementById('company-name').value = inv.vals.companyName;
        document.getElementById('company-email').value = inv.vals.companyEmail;
        document.getElementById('client-name').value = inv.vals.clientName;
        document.getElementById('client-address').value = inv.vals.clientAddress;
        document.getElementById('invoice-number').value = inv.vals.invoiceNumber;
        
        if(inv.vals.invoiceDateRaw) {
            document.getElementById('invoice-date').value = inv.vals.invoiceDateRaw;
        }
        
        taxRateInput.value = inv.vals.taxRate;
        discountTypeInput.value = inv.vals.discountType || 'amount';
        discountAmountInput.value = inv.vals.discountValue || 0;

        items = JSON.parse(JSON.stringify(inv.items));
        renderItems();
        calculateTotals();

        historyArea.classList.remove('active');
        editorArea.classList.add('active');
        window.scrollTo(0,0);
    };

    window.deleteInvoice = function(index) {
        if(confirm("Delete this saved invoice?")) {
            invoiceHistory.splice(index, 1);
            localStorage.setItem('rainbow_invoices', JSON.stringify(invoiceHistory));
            renderHistory();
        }
    };
});
