// --- ĐƯỜNG DẪN LINK API CLOUDFLARE WORKER ---
const CLOUDFLARE_API_URL = "https://hoadonintamtan.catchudecan.workers.dev";

let invoices = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadFromCloudflare();
    renderInvoices();
});

// ĐỒNG BỘ DỮ LIỆU TỪ CLOUDFLARE KV VỀ MÁY
async function loadFromCloudflare() {
    try {
        const response = await fetch(CLOUDFLARE_API_URL);
        if (!response.ok) throw new Error("Kết nối đám mây thất bại");
        const data = await response.json();
        invoices = data || [];
    } catch (error) {
        console.error("Lỗi khi đồng bộ từ Cloudflare:", error);
    }
}

// ĐẨY DỮ LIỆU ĐÃ CẬP NHẬT LÊN ĐÁM MÂY KV
async function saveToCloudflare() {
    try {
        await fetch(CLOUDFLARE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(invoices)
        });
    } catch (error) {
        console.error("Lỗi hệ thống không thể lưu lên Cloudflare:", error);
    }
}

function setupEventListeners() {
    // Sự kiện chuyển tab bộ lọc ở Sidebar trái
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.tab;
            
            const titles = { 
                'all': 'Danh sách yêu cầu xuất hóa đơn', 
                'Nháp': 'Hóa đơn Nháp (Chờ kế toán xuất)', 
                'Hoàn thành': 'Hóa đơn đã xuất hoàn thành' 
            };
            document.getElementById('tableTitle').innerText = titles[currentFilter];
            renderInvoices();
        });
    });

    document.getElementById('btnAddNew').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('btnCancel').addEventListener('click', closeModal);
    document.getElementById('invoiceForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('globalSearch').addEventListener('input', renderInvoices);
    document.getElementById('btnAddRow').addEventListener('click', () => addProductRow());

    // Lắng nghe toàn bộ sự kiện gõ, chỉnh sửa trên ô nhập VAT
    const vatInput = document.getElementById('vatOverride');
    if (vatInput) {
        vatInput.addEventListener('input', calculateTableTotals);
        vatInput.addEventListener('change', calculateTableTotals);
        vatInput.addEventListener('keyup', calculateTableTotals);
    }

    // Kinh doanh chọn ảnh bill chuyển khoản
    document.getElementById('fileUploadInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        document.getElementById('uploadStatusText').innerText = "Đang đồng bộ file lên hệ thống...";
        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('fileLinkData').value = evt.target.result;
            document.getElementById('uploadStatusText').innerText = "✓ Đã lưu file lên Cloud (" + file.name + ")";
        };
        reader.readAsDataURL(file);
    });

    // Các nút điều khiển đóng mở popup tải file của kế toán
    document.getElementById('closeAccModalBtn').addEventListener('click', closeAccModal);
    document.getElementById('btnCancelAcc').addEventListener('click', closeAccModal);
    document.getElementById('btnSaveAccFile').addEventListener('click', handleAccFileUpload);
}

// --- QUẢN LÝ TÁCH CỘT DÒNG SẢN PHẨM ĐỘNG ---
function addProductRow(content = '', qty = '', price = '') {
    const tbody = document.getElementById('itemsTableBody');
    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 4);
    
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.className = 'product-data-row';
    tr.innerHTML = `
        <td><input type="text" class="item-content" required placeholder="Ví dụ: 10qx, 50t sticker a3..." value="${content}"></td>
        <td><input type="number" class="item-qty" required min="1" placeholder="1" value="${qty}"></td>
        <td><input type="number" class="item-price" required min="0" placeholder="Đơn giá" value="${price}"></td>
        <td class="item-amount" style="font-weight:600; text-align:right; padding-right:10px;">0đ</td>
        <td><button type="button" class="btn-remove-row" onclick="removeProductRow('${rowId}')"><i class="fa-solid fa-trash"></i></button></td>
    `;
    
    tbody.appendChild(tr);
    tr.querySelector('.item-qty').addEventListener('input', () => updateRowAmount(tr));
    tr.querySelector('.item-price').addEventListener('input', () => updateRowAmount(tr));
    
    if(qty && price) updateRowAmount(tr);
}

function removeProductRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateTableTotals();
    }
}

function updateRowAmount(tr) {
    const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
    const price = parseFloat(tr.querySelector('.item-price').value) || 0;
    const amount = qty * price;
    tr.querySelector('.item-amount').innerText = amount.toLocaleString('vi-VN') + 'đ';
    calculateTableTotals();
}

// --- TỰ ĐỘNG TÍNH TOÁN THEO SỐ % VAT BẠN TỰ SỬA ---
function calculateTableTotals() {
    let subtotal = 0;
    document.querySelectorAll('.product-data-row').forEach(tr => {
        const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
    });
    
    const vatOverrideInput = document.getElementById('vatOverride');
    
    let vatPercent = parseFloat(vatOverrideInput.value);
    if (isNaN(vatPercent)) {
        vatPercent = 8; 
    }
    
    let vat = Math.round(subtotal * (vatPercent / 100));
    if (subtotal === 0) vat = 0;
    
    const grandTotal = subtotal + vat;
    
    document.getElementById('lblSubTotal').innerText = subtotal.toLocaleString('vi-VN') + 'đ';
    document.getElementById('lblGrandTotal').innerText = grandTotal.toLocaleString('vi-VN') + 'đ';
}

// --- ĐÓNG MỞ CỬA SỔ POPUP MODAL CHÍNH ---
function openModal(id = null) {
    const modal = document.getElementById('invoiceModal');
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceId').value = '';
    document.getElementById('itemsTableBody').innerHTML = '';
    document.getElementById('fileLinkData').value = '';
    document.getElementById('uploadStatusText').innerText = "Chưa có file nào được chọn";
    document.getElementById('vatOverride').value = ''; 
    
    document.getElementById('modalTitle').innerText = "Tạo yêu cầu xuất hóa đơn đỏ";
    document.getElementById('invoiceStatus').value = "Nháp";

    if (id) {
        document.getElementById('modalTitle').innerText = "Cập nhật dữ liệu hóa đơn";
        const inv = invoices.find(i => i.id === id);
        if (inv) {
            document.getElementById('invoiceId').value = inv.id;
            document.getElementById('companyName').value = inv.companyName;
            document.getElementById('companyAddress').value = inv.companyAddress;
            document.getElementById('companyMst').value = inv.companyMst;
            document.getElementById('companyEmail').value = inv.companyEmail;
            document.getElementById('invoiceStatus').value = inv.status;
            
            document.getElementById('vatOverride').value = inv.vatPercent !== undefined ? inv.vatPercent : '';
            document.getElementById('fileLinkData').value = inv.fileLink || '';
            
            if (inv.fileLink) {
                document.getElementById('uploadStatusText').innerText = "✓ Đã có file chứng từ cũ lưu trên Cloud";
            }
            if(inv.products && inv.products.length > 0) {
                inv.products.forEach(p => addProductRow(p.content, p.qty, p.price));
            }
        }
    } else {
        addProductRow();
    }
    calculateTableTotals();
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('invoiceModal').classList.remove('active');
}

// --- XỬ LÝ UP FILE HOÁ ĐƠN ĐỎ DÀNH CHO KẾ TOÁN ---
function openAccUploadModal(id) {
    document.getElementById('targetInvoiceId').value = id;
    document.getElementById('accFileInput').value = '';
    document.getElementById('accountantUploadModal').classList.add('active');
}

function closeAccModal() {
    document.getElementById('accountantUploadModal').classList.remove('active');
}

function handleAccFileUpload() {
    const id = document.getElementById('targetInvoiceId').value;
    const fileInput = document.getElementById('accFileInput');
    const file = fileInput.files[0];
    
    if(!file) {
        alert("Vui lòng chọn file bản nháp hóa đơn đỏ cần up lên!");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(evt) {
        const idx = invoices.findIndex(i => i.id === id);
        if (idx !== -1) {
            invoices[idx].redInvoiceFile = evt.target.result; 
            invoices[idx].status = 'Hoàn thành'; 
            closeAccModal();
            renderInvoices();
            await saveToCloudflare();
            alert("Đã tải bản nháp hóa đơn đỏ lên hệ thống thành công!");
        }
    };
    reader.readAsDataURL(file);
}

// --- LƯU BIỂU MẪU CHÍNH ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('invoiceId').value;
    
    const products = [];
    let subtotal = 0;
    document.querySelectorAll('.product-data-row').forEach(tr => {
        const content = tr.querySelector('.item-content').value;
        const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.item-price').value) || 0;
        products.push({ content, qty, price });
        subtotal += qty * price;
    });

    if(products.length === 0) {
        alert("Vui lòng nhập ít nhất 1 dòng nội dung đơn hàng!");
        return;
    }

    let vatPercent = parseFloat(document.getElementById('vatOverride').value);
    if (isNaN(vatPercent)) {
        vatPercent = 8; 
    }
    const vatCost = Math.round(subtotal * (vatPercent / 100));
    const totalCost = subtotal + vatCost;

    const invData = {
        products,
        subtotal,
        vatPercent,
        vatCost,
        totalCost,
        fileLink: document.getElementById('fileLinkData').value,
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyMst: document.getElementById('companyMst').value,
        companyEmail: document.getElementById('companyEmail').value,
        status: document.getElementById('invoiceStatus').value
    };

    if (id) {
        const idx = invoices.findIndex(i => i.id === id);
        if (idx !== -1) {
            invData.redInvoiceFile = invoices[idx].redInvoiceFile || null; 
            invoices[idx] = { id, ...invData };
        }
    } else {
        invData.id = 'inv-' + Date.now();
        invData.redInvoiceFile = null;
        invoices.push(invData);
    }

    closeModal();
    renderInvoices();
    await saveToCloudflare();
}

async function quickApprove(id) {
    const idx = invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
        invoices[idx].status = 'Hoàn thành';
        renderInvoices();
        await saveToCloudflare();
    }
}

async function deleteInvoice(id) {
    if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn dữ liệu hóa đơn này khỏi đám mây?")) {
        invoices = invoices.filter(i => i.id !== id);
        renderInvoices();
        await saveToCloudflare();
    }
}

// --- BIỂU DIỄN VÀ ĐIỀN DỮ LIỆU RA GIAO DIỆN CHÍNH ---
function renderInvoices() {
    const search = document.getElementById('globalSearch').value.toLowerCase();
    const tbody = document.getElementById('invoiceTableBody');
    tbody.innerHTML = '';

    const filtered = invoices.filter(i => {
        const matchesFilter = (currentFilter === 'all' || i.status === currentFilter);
        const hasProductMatch = i.products && i.products.some(p => p.content.toLowerCase().includes(search));
        const matchesSearch = i.companyName.toLowerCase().includes(search) || 
                              i.companyMst.includes(search) || hasProductMatch;
        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        // Đã xóa style="background:white" ở đây nếu có
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 30px;">Không tìm thấy dữ liệu hóa đơn nào phù hợp.</td></tr>`;
        return;
    }

    filtered.forEach(i => {
        const fileDisplay = i.fileLink 
            ? `<a href="${i.fileLink}" download="ChungTu_Bill_Chuyen_Khoan" class="file-view-link"><i class="fa-solid fa-image"></i> Xem file</a>` 
            : '<span class="text-muted" style="font-size:12px;">Không có tệp</span>';
        
        let redInvoiceDisplay = '';
        if (i.redInvoiceFile) {
            redInvoiceDisplay = `<a href="${i.redInvoiceFile}" download="Ban_Nhap_Hoa_Don_Do" class="file-download-link"><i class="fa-solid fa-file-pdf"></i> Tải hóa đơn</a>`;
        } else {
            redInvoiceDisplay = `<button class="btn-outline-primary" onclick="openAccUploadModal('${i.id}')"><i class="fa-solid fa-cloud-arrow-up"></i> Up bản nháp</button>`;
        }

        const approveAction = i.status === 'Nháp' 
            ? `<button class="btn-success-sm" onclick="quickApprove('${i.id}')" style="margin-bottom:6px;"><i class="fa-solid fa-check"></i> Duyệt xong</button>` 
            : '';

        let productsHtml = `<table class="display-item-table">`;
        if (i.products) {
            i.products.forEach(p => {
                productsHtml += `
                    <tr>
                        <td><strong>${p.content}</strong></td>
                        <td style="text-align:center; color:var(--text-muted);">x${p.qty}</td>
                        <td style="text-align:right;">${(p.qty * p.price).toLocaleString('vi-VN')}đ</td>
                    </tr>`;
            });
        }
        
        const currentVat = i.vatPercent !== undefined ? i.vatPercent : 8;
        
        // ĐÃ SỬA LỖI Ở ĐÂY: Xóa bỏ background:#f1f5f9; gây ra mảng xám đè lên giao diện
        productsHtml += `
            <tr style="font-weight:700; border-top: 1px dashed rgba(0,0,0,0.1);">
                <td colspan="2" style="padding-top: 8px;">Tổng (gồm VAT ${currentVat}%):</td>
                <td style="text-align:right; color:#ef4444; padding-top: 8px;">${(i.totalCost || i.subtotal || 0).toLocaleString('vi-VN')}đ</td>
            </tr>
        </table>`;

        tbody.innerHTML += `
            <tr>
                <td>${productsHtml}</td>
                <td>
                    <div style="font-weight:700; font-size:15px; color:#1e293b;">${i.companyName}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin:4px 0;"><i class="fa-solid fa-location-dot"></i> ${i.companyAddress}</div>
                    <div style="font-size:13px; margin-top:6px;"><strong>Mã số thuế:</strong> <span class="text-primary" style="font-weight:700; font-size:14px; letter-spacing:0.5px;">${i.companyMst}</span></div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px;"><strong>Email nhận:</strong> ${i.companyEmail || 'N/A'}</div>
                </td>
                <td>${fileDisplay}</td>
                <td>
                    <div style="margin-bottom: 6px;"><span class="badge badge-${i.status}">${i.status}</span></div>
                    ${redInvoiceDisplay}
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        ${approveAction}
                        <div class="action-btns" style="margin-top:4px; padding-left:2px;">
                            <button class="btn-edit" onclick="openModal('${i.id}')" title="Sửa dữ liệu"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-delete" onclick="deleteInvoice('${i.id}')" title="Xóa dữ liệu"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
}