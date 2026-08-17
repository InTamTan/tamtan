// ==================== KHỞI TẠO FIREBASE SDK V10 & CLOUDFLARE KV ====================
const firebaseConfig = {
    apiKey: "AIzaSyA1N0VP1w4R8cMj4sOR7_-EWEybR1SThgA",
    authDomain: "sinup-626bd.firebaseapp.com",
    projectId: "sinup-626bd",
    storageBucket: "sinup-626bd.firebasestorage.app",
    messagingSenderId: "600624155042",
    appId: "1:600624155042:web:492196cf636df2b21acafb",
    measurementId: "G-89HFP58ELP"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// API Cloudflare KV Quản lý Hóa đơn
const CLOUDFLARE_API_URL = "https://hoadonintamtan.catchudecan.workers.dev";

let invoices = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {

    const authModal = document.getElementById('authModal');
    const openAuthBtn = document.getElementById('openAuthModal');
    const closeAuthBtn = document.getElementById('closeAuthModal');
    const headerUserBtn = document.getElementById('headerUserBtn');

    // ==================== ĐỒNG BỘ TRẠNG THÁI ĐĂNG NHẬP & CHÀO TÊN ĐĂNG KÝ ====================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            let displayName = user.displayName;
            if (!displayName) {
                try {
                    const docSnap = await db.collection('users').doc(user.uid).get();
                    if (docSnap.exists) {
                        displayName = docSnap.data().name;
                    }
                } catch (e) {
                    console.log(e);
                }
            }
            if (!displayName) displayName = user.email.split('@')[0];

            if (openAuthBtn) {
                openAuthBtn.innerText = `Chào, ${displayName}`;
                openAuthBtn.classList.add('logged-in');
            }

            if (headerUserBtn) {
                headerUserBtn.innerText = `Chào, ${displayName}`;
                headerUserBtn.classList.add('logged-in');
            }

            const txtUserName = document.getElementById('txtUserName');
            if (txtUserName) txtUserName.innerText = displayName;

            if (window.location.pathname.includes('hoadonintamtan.html')) {
                setupInvoicePageEvents();
                await loadFromCloudflare();
                renderInvoices();
            }

        } else {
            if (openAuthBtn) {
                openAuthBtn.innerText = 'Tài Khoản';
                openAuthBtn.classList.remove('logged-in');
            }
            if (headerUserBtn) {
                headerUserBtn.innerText = 'Tài Khoản';
                headerUserBtn.classList.remove('logged-in');
            }

            if (window.location.pathname.includes('hoadonintamtan.html')) {
                alert("Vui lòng đăng nhập để xem thông tin hóa đơn!");
                window.location.href = 'index.html';
            }
        }
    });

    // ==================== BẢO VỆ LIÊN KẾT HÓA ĐƠN TRÊN INDEX ====================
    document.querySelectorAll('a[href*="hoadonintamtan.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const user = auth.currentUser;
            if (!user) {
                e.preventDefault();
                alert("Vui lòng đăng nhập tài khoản để tra cứu hóa đơn!");
                if (authModal) authModal.classList.add('active');
            }
        });
    });

    const userBtn = openAuthBtn || headerUserBtn;
    if (userBtn) {
        userBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user) {
                if (confirm(`Bạn đang đăng nhập với tài khoản: ${user.email}\nBạn có muốn ĐĂNG XUẤT không?`)) {
                    auth.signOut().then(() => alert("Đã đăng xuất thành công!"));
                }
            } else {
                if (authModal) authModal.classList.add('active');
            }
        });
    }

    const btnSidebarLogout = document.getElementById('btnSidebarLogout');
    if (btnSidebarLogout) {
        btnSidebarLogout.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn ĐĂNG XUẤT tài khoản?")) {
                auth.signOut().then(() => alert("Đã đăng xuất thành công!"));
            }
        });
    }

    if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => authModal && authModal.classList.remove('active'));

    const allInputs = document.querySelectorAll('.ios-input-box input, .ios-input-box textarea');
    allInputs.forEach(input => {
        const wrapper = input.closest('.neon-input-wrapper');
        if (wrapper) {
            input.addEventListener('focus', () => wrapper.classList.add('active'));
            input.addEventListener('blur', () => wrapper.classList.remove('active'));
        }
    });

    // ==================== TÌM KIẾM AESTHETIC EXPANDABLE ====================
    const searchContainer = document.getElementById('searchContainer');
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const productGrid = document.getElementById('productGrid');

    if (searchToggleBtn && searchContainer && searchInput) {
        searchToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target) && searchInput.value.trim() === '') {
                searchContainer.classList.remove('active');
            }
        });
    }

    if (searchInput && productGrid) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = productGrid.querySelectorAll('.menu-card');

            cards.forEach(card => {
                const name = card.dataset.name || '';
                const text = card.textContent.toLowerCase();

                if (name.includes(query) || text.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // ==================== MODAL REVIEW CHI TIẾT SẢN PHẨM ====================
    const productDetailModal = document.getElementById('productDetailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    
    const detailMainImg = document.getElementById('detailMainImg');
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');
    const specMaterial = document.getElementById('specMaterial');
    const specSize = document.getElementById('specSize');
    const specTime = document.getElementById('specTime');

    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', function() {
            const title = this.dataset.title || this.querySelector('h3').innerText;
            const img = this.dataset.img || this.querySelector('.menu-img').src;
            const desc = this.dataset.desc || this.querySelector('.product-desc').innerText;
            const material = this.dataset.material || "Chất liệu cao cấp In Tam Tân";
            const size = this.dataset.size || "Kích thước theo yêu cầu";
            const time = this.dataset.time || "Lấy ngay trong ngày";

            if (detailMainImg) detailMainImg.src = img;
            if (detailTitle) detailTitle.innerText = title;
            if (detailDesc) detailDesc.innerText = desc;
            if (specMaterial) specMaterial.innerText = material;
            if (specSize) specSize.innerText = size;
            if (specTime) specTime.innerText = time;

            if (productDetailModal) productDetailModal.classList.add('active');
        });
    });

    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            if (productDetailModal) productDetailModal.classList.remove('active');
        });
    }

    // ==================== VIDEO MODAL ====================
    const playVideoBtn = document.getElementById('playVideoBtn');
    const videoModal = document.getElementById('videoModal');
    const videoIframe = document.getElementById('videoIframe');
    const closeVideoModal = document.getElementById('closeVideoModal');

    if (playVideoBtn) {
        playVideoBtn.addEventListener('click', () => {
            if (videoIframe && videoModal) {
                videoIframe.src = "https://www.youtube.com/embed/ED5EVIqdBmo?autoplay=1";
                videoModal.classList.add('active');
            }
        });
    }

    if (closeVideoModal) {
        closeVideoModal.addEventListener('click', () => {
            if (videoModal) videoModal.classList.remove('active');
            if (videoIframe) videoIframe.src = "";
        });
    }

    // ==================== CHUYỂN ĐỔI TAB ĐĂNG NHẬP / ĐĂNG KÝ ====================
    const authDualContainer = document.getElementById('authDualContainer');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const switchToRegisterMobile = document.getElementById('switchToRegisterMobile');
    const switchToLoginMobile = document.getElementById('switchToLoginMobile');

    if (switchToRegister && authDualContainer) {
        switchToRegister.addEventListener('click', () => authDualContainer.classList.add('right-panel-active'));
    }
    if (switchToLogin && authDualContainer) {
        switchToLogin.addEventListener('click', () => authDualContainer.classList.remove('right-panel-active'));
    }
    if (switchToRegisterMobile && authDualContainer) {
        switchToRegisterMobile.addEventListener('click', (e) => { e.preventDefault(); authDualContainer.classList.add('right-panel-active'); });
    }
    if (switchToLoginMobile && authDualContainer) {
        switchToLoginMobile.addEventListener('click', (e) => { e.preventDefault(); authDualContainer.classList.remove('right-panel-active'); });
    }

    // ==================== NÚT TRỜ VỀ ĐẦU TRANG & THEME SÁNG/TỐI ====================
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            if (themeIcon) themeIcon.innerText = isLight ? '☀️' : '🌙';
        });
    }

    // ==================== FIREBASE AUTH FORM SUBMIT ====================
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        const emailInput = document.getElementById('authEmail');
        const rememberCheckbox = document.getElementById('rememberMe');
        if (emailInput) emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    const authLoginForm = document.getElementById('authLoginForm');
    if (authLoginForm) {
        authLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value.trim();
            const rememberMe = document.getElementById('rememberMe').checked;

            const persistenceType = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

            auth.setPersistence(persistenceType)
                .then(() => auth.signInWithEmailAndPassword(email, password))
                .then((userCredential) => {
                    if (rememberMe) {
                        localStorage.setItem('rememberedEmail', email);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                    }
                    alert(`Đăng nhập thành công! Chào mừng ${userCredential.user.displayName || userCredential.user.email}`);
                    if (authModal) authModal.classList.remove('active');
                })
                .catch((error) => {
                    alert(`Lỗi đăng nhập: ${error.message}`);
                });
        });
    }

    const authRegisterForm = document.getElementById('authRegisterForm');
    if (authRegisterForm) {
        authRegisterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value.trim();

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: name }).then(() => {
                        return db.collection('users').doc(user.uid).set({
                            name: name,
                            phone: phone,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                })
                .then(() => {
                    alert(`Đăng ký thành công! Chào mừng ${name}`);
                    if (authModal) authModal.classList.remove('active');
                    authRegisterForm.reset();
                })
                .catch((error) => {
                    alert(`Lỗi đăng ký: ${error.message}`);
                });
        });
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            if (!email) {
                alert("Vui lòng nhập Email của bạn vào ô bên trên rồi nhấn 'Quên mật khẩu'!");
                return;
            }

            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert(`Hướng dẫn khôi phục mật khẩu đã gửi tới: ${email}`);
                })
                .catch((error) => {
                    alert(`Lỗi gửi email khôi phục: ${error.message}`);
                });
        });
    }

    const googleAuthBtn = document.getElementById('googleAuthBtn');
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    alert(`Đăng nhập Google thành công! Chào mừng ${result.user.displayName}`);
                    if (authModal) authModal.classList.remove('active');
                })
                .catch((error) => {
                    alert(`Lỗi đăng nhập Google: ${error.message}`);
                });
        });
    }

    // ==================== FORM PHẢN HỒI EMAIL (GỬI QUA EMAILJS) ====================
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "ĐANG GỬI PHẢN HỒI...";
            submitBtn.disabled = true;

            const name = document.getElementById('fbName').value.trim();
            const email = document.getElementById('fbEmail').value.trim();
            const message = document.getElementById('fbMessage').value.trim();

            const SERVICE_ID = "service_7d00hsc";
            const TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // Thay mã Template ID của bạn trên EmailJS vào đây
            const PUBLIC_KEY = "DZIF7NMoonp_glgr8";   

            const templateParams = {
                from_name: name,
                email: email,
                message: message
            };

            try {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
                alert("✅ Cảm ơn bạn! Yêu cầu báo giá và phản hồi đã được gửi thành công đến In Tam Tân.");
                feedbackForm.reset();
            } catch (error) {
                console.error("EmailJS Error:", error);
                alert("❌ Gửi thất bại! Vui lòng liên hệ trực tiếp qua Zalo/Hotline.");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// ==================== CLOUDFLARE WORKER & HÓA ĐƠN ENGINE ====================
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

function updateDashboardStats() {
    const totalCount = invoices.length;
    const draftCount = invoices.filter(i => i.status === 'Nháp').length;
    const totalValue = invoices.reduce((sum, i) => sum + (i.totalCost || i.subtotal || 0), 0);

    const lblCount = document.getElementById('statTotalCount');
    const lblVal = document.getElementById('statTotalValue');
    const lblDraft = document.getElementById('statDraftCount');

    if (lblCount) lblCount.innerText = totalCount;
    if (lblVal) lblVal.innerText = totalValue.toLocaleString('vi-VN') + 'đ';
    if (lblDraft) lblDraft.innerText = draftCount;

    const monthlyTotals = Array(12).fill(0);
    invoices.forEach(inv => {
        const dateObj = inv.timestamp ? new Date(inv.timestamp) : new Date();
        const monthIndex = dateObj.getMonth();
        monthlyTotals[monthIndex] += (inv.totalCost || inv.subtotal || 0);
    });

    const maxVal = Math.max(...monthlyTotals, 1);
    for (let m = 0; m < 12; m++) {
        const bar = document.getElementById(`chartBar${m + 1}`);
        if (bar) {
            const hPercent = Math.round((monthlyTotals[m] / maxVal) * 100);
            bar.style.height = `${Math.max(hPercent, 4)}%`;
            bar.title = `Tháng ${m + 1}: ${monthlyTotals[m].toLocaleString('vi-VN')}đ`;
        }
    }
}

function setupInvoicePageEvents() {
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.tab;
            
            const titles = { 
                'all': 'Danh sách yêu cầu xuất hóa đơn theo Công Ty', 
                'Nháp': 'Hóa đơn Nháp (Chờ kế toán xuất) theo Công Ty', 
                'Hoàn thành': 'Hóa đơn đã xuất hoàn thành theo Công Ty' 
            };
            const tableTitle = document.getElementById('tableTitle');
            if (tableTitle) tableTitle.innerText = titles[currentFilter];
            renderInvoices();
        });
    });

    const btnAddNew = document.getElementById('btnAddNew');
    if (btnAddNew) btnAddNew.addEventListener('click', () => openInvoiceModal());
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeInvoiceModal);
    
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) btnCancel.addEventListener('click', closeInvoiceModal);
    
    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) invoiceForm.addEventListener('submit', handleInvoiceFormSubmit);
    
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) globalSearch.addEventListener('input', renderInvoices);
    
    const btnAddRow = document.getElementById('btnAddRow');
    if (btnAddRow) btnAddRow.addEventListener('click', () => addProductRow());

    const vatInput = document.getElementById('vatOverride');
    if (vatInput) {
        vatInput.addEventListener('input', calculateTableTotals);
        vatInput.addEventListener('change', calculateTableTotals);
        vatInput.addEventListener('keyup', calculateTableTotals);
    }

    const fileUploadInput = document.getElementById('fileUploadInput');
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', function(e) {
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
    }

    const closeAccModalBtn = document.getElementById('closeAccModalBtn');
    if (closeAccModalBtn) closeAccModalBtn.addEventListener('click', closeAccModal);
    
    const btnCancelAcc = document.getElementById('btnCancelAcc');
    if (btnCancelAcc) btnCancelAcc.addEventListener('click', closeAccModal);
    
    const btnSaveAccFile = document.getElementById('btnSaveAccFile');
    if (btnSaveAccFile) btnSaveAccFile.addEventListener('click', handleAccFileUpload);
}

function addProductRow(content = '', qty = '', price = '') {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 4);
    
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.className = 'product-data-row';
    tr.innerHTML = `
        <td><input type="text" class="item-content" required placeholder="Ví dụ: 10qx, 50t sticker a3..." value="${content}"></td>
        <td><input type="number" class="item-qty" required min="1" placeholder="1" value="${qty}" style="text-align: center;"></td>
        <td><input type="number" class="item-price" required min="0" placeholder="Đơn giá" value="${price}"></td>
        <td class="item-amount" style="font-weight: 800; text-align: right; padding-right: 10px; color: var(--text-main);">0đ</td>
        <td><button type="button" onclick="removeProductRow('${rowId}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:1.1rem; padding: 4px;"><i class="fa-solid fa-trash-can"></i></button></td>
    `;
    
    tbody.appendChild(tr);
    tr.querySelector('.item-qty').addEventListener('input', () => updateRowAmount(tr));
    tr.querySelector('.item-price').addEventListener('input', () => updateRowAmount(tr));
    
    if(qty && price) updateRowAmount(tr);
}

window.removeProductRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateTableTotals();
    }
};

function updateRowAmount(tr) {
    const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
    const price = parseFloat(tr.querySelector('.item-price').value) || 0;
    const amount = qty * price;
    tr.querySelector('.item-amount').innerText = amount.toLocaleString('vi-VN') + 'đ';
    calculateTableTotals();
}

function calculateTableTotals() {
    let subtotal = 0;
    document.querySelectorAll('.product-data-row').forEach(tr => {
        const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
    });
    
    const vatOverrideInput = document.getElementById('vatOverride');
    let vatPercent = vatOverrideInput ? parseFloat(vatOverrideInput.value) : 8;
    if (isNaN(vatPercent)) vatPercent = 8;
    
    let vat = Math.round(subtotal * (vatPercent / 100));
    if (subtotal === 0) vat = 0;
    
    const grandTotal = subtotal + vat;
    
    const lblSubTotal = document.getElementById('lblSubTotal');
    const lblGrandTotal = document.getElementById('lblGrandTotal');
    if (lblSubTotal) lblSubTotal.innerText = subtotal.toLocaleString('vi-VN') + 'đ';
    if (lblGrandTotal) lblGrandTotal.innerText = grandTotal.toLocaleString('vi-VN') + 'đ';
}

function openInvoiceModal(id = null) {
    const modal = document.getElementById('invoiceModal');
    if (!modal) return;
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

function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    if (modal) modal.classList.remove('active');
}

window.openAccUploadModal = function(id) {
    document.getElementById('targetInvoiceId').value = id;
    document.getElementById('accFileInput').value = '';
    const modal = document.getElementById('accountantUploadModal');
    if (modal) modal.classList.add('active');
};

function closeAccModal() {
    const modal = document.getElementById('accountantUploadModal');
    if (modal) modal.classList.remove('active');
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

async function handleInvoiceFormSubmit(e) {
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
    if (isNaN(vatPercent)) vatPercent = 8; 
    
    const vatCost = Math.round(subtotal * (vatPercent / 100));
    const totalCost = subtotal + vatCost;

    const now = new Date();
    const createdAtStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('vi-VN');

    // Lấy thông tin tài khoản đang đăng nhập để gắn vào hóa đơn
    const currentUser = auth.currentUser;
    const userEmail = currentUser ? currentUser.email.toLowerCase().trim() : '';
    const userId = currentUser ? currentUser.uid : '';

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
        status: document.getElementById('invoiceStatus').value,
        createdByEmail: userEmail,
        createdByUid: userId
    };

    if (id) {
        const idx = invoices.findIndex(i => i.id === id);
        if (idx !== -1) {
            invData.createdAt = invoices[idx].createdAt || createdAtStr;
            invData.timestamp = invoices[idx].timestamp || Date.now();
            invData.redInvoiceFile = invoices[idx].redInvoiceFile || null; 
            invData.createdByEmail = invoices[idx].createdByEmail || userEmail;
            invData.createdByUid = invoices[idx].createdByUid || userId;
            invoices[idx] = { id, ...invData };
        }
    } else {
        invData.id = 'inv-' + Date.now();
        invData.createdAt = createdAtStr;
        invData.timestamp = Date.now();
        invData.redInvoiceFile = null;
        invoices.push(invData);
    }

    closeInvoiceModal();
    renderInvoices();
    await saveToCloudflare();
}

window.quickApprove = async function(id) {
    const idx = invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
        invoices[idx].status = 'Hoàn thành';
        renderInvoices();
        await saveToCloudflare();
    }
};

window.deleteInvoice = async function(id) {
    if (confirm("Vui lòng xác nhận xóa vĩnh viễn dữ liệu hóa đơn này?")) {
        invoices = invoices.filter(i => i.id !== id);
        renderInvoices();
        await saveToCloudflare();
    }
};

function renderInvoices() {
    updateDashboardStats();

    // --- PHÂN QUYỀN: XÁC ĐỊNH TÀI KHOẢN CEO ---
    const user = auth.currentUser;
    const userEmail = user ? user.email.toLowerCase().trim() : '';
    const userDisplayName = user && user.displayName ? user.displayName.toLowerCase().trim() : '';

    const ceoEmails = ['intamtan2', 'admin@intamtan.net', 'intamtan.net']; 
    const isCeo = ceoEmails.some(ceo => userEmail.includes(ceo) || userDisplayName.includes(ceo));

    // Ẩn / Hiện khối 3 thẻ thống kê (.stats-grid) theo quyền hạn
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        statsGrid.style.display = isCeo ? 'grid' : 'none';
    }

    const globalSearch = document.getElementById('globalSearch');
    const search = globalSearch ? globalSearch.value.toLowerCase().trim() : '';
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    invoices.sort((a, b) => {
        if (a.status === 'Nháp' && b.status !== 'Nháp') return -1;
        if (a.status !== 'Nháp' && b.status === 'Nháp') return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    // --- PHÂN QUYỀN: LỌC DỮ LIỆU HÓA ĐƠN ---
    const filtered = invoices.filter(i => {
        if (!isCeo) {
            const invoiceEmail = (i.companyEmail || '').toLowerCase().trim();
            const createdEmail = (i.createdByEmail || '').toLowerCase().trim();
            const createdUid = i.createdByUid || '';
            
            // Khách sẽ thấy hóa đơn nếu do chính tài khoản của họ tạo HOẶC email công ty trùng khớp
            const matchesUser = (createdEmail && createdEmail === userEmail) || 
                                (createdUid && user && createdUid === user.uid) || 
                                (invoiceEmail && invoiceEmail === userEmail);
            if (!matchesUser) {
                return false;
            }
        }

        const matchesFilter = (currentFilter === 'all' || i.status === currentFilter);
        const hasProductMatch = i.products && i.products.some(p => p.content.toLowerCase().includes(search));
        const matchesSearch = (i.companyName || '').toLowerCase().includes(search) || 
                              (i.companyMst || '').includes(search) || hasProductMatch;
        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 30px;">Không tìm thấy dữ liệu hóa đơn nào phù hợp.</td></tr>`;
        return;
    }

    const groupedCompanies = {};
    filtered.forEach(inv => {
        const key = (inv.companyMst || inv.companyName || 'danh-sach-khac').trim().toLowerCase();
        if (!groupedCompanies[key]) {
            groupedCompanies[key] = {
                companyName: inv.companyName,
                companyMst: inv.companyMst,
                companyAddress: inv.companyAddress,
                companyEmail: inv.companyEmail,
                items: []
            };
        }
        groupedCompanies[key].items.push(inv);
    });

    let html = '';

    Object.values(groupedCompanies).forEach(group => {
        const groupTotal = group.items.reduce((sum, item) => sum + (item.totalCost || item.subtotal || 0), 0);
        const draftCount = group.items.filter(item => item.status === 'Nháp').length;

        html += `
        <tr class="company-header-row" style="background: rgba(0, 136, 255, 0.08); border-top: 2px solid #0088ff;">
            <td colspan="5" style="padding: 12px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-size: 1rem; font-weight: 800; color: var(--text-main);"><i class="fa-solid fa-building" style="color:#0088ff; margin-right:6px;"></i> ${group.companyName}</span>
                        <span style="margin-left: 12px; font-weight: 700; color: #0088ff; font-size: 0.85rem;">MST: ${group.companyMst}</span>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;"><i class="fa-solid fa-location-dot"></i> ${group.companyAddress} | ✉️ ${group.companyEmail || 'Chưa có email'}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge" style="background: #0088ff; color: #fff; font-size: 0.75rem; padding: 4px 10px;">${group.items.length} Yêu cầu</span>
                        ${draftCount > 0 ? `<span class="badge badge-danger" style="font-size: 0.75rem; padding: 4px 10px; margin-left: 6px;">${draftCount} Nháp</span>` : ''}
                        <span style="font-size: 0.95rem; font-weight: 800; color: var(--accent-red); margin-left: 12px;">Tổng: ${groupTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>
            </td>
        </tr>`;

        group.items.forEach(i => {
            const fileDisplay = i.fileLink 
                ? `<a href="${i.fileLink}" download="Bill_Chuyen_Khoan" style="color:#0066ff; text-decoration:none; font-weight:700;"><i class="fa-solid fa-image"></i> Xem Bill</a>` 
                : '<span style="color:var(--text-muted); font-size:0.8rem;">Không có file</span>';
            
            let redInvoiceDisplay = '';
            if (i.redInvoiceFile) {
                redInvoiceDisplay = `<a href="${i.redInvoiceFile}" download="Ban_Nhap_Hoa_Don_Do" style="color:#34c759; text-decoration:none; font-weight:700;"><i class="fa-solid fa-file-pdf"></i> Tải HĐ Đỏ</a>`;
            } else {
                redInvoiceDisplay = `<button class="ios-submit-btn btn-outline" onclick="openAccUploadModal('${i.id}')" style="height:28px; font-size:0.75rem; padding:0 8px;"><i class="fa-solid fa-cloud-arrow-up"></i> Up nháp</button>`;
            }

            const approveAction = i.status === 'Nháp' 
                ? `<button class="ios-submit-btn btn-green" onclick="quickApprove('${i.id}')" style="height:28px; font-size:0.75rem; padding:0 8px; margin-bottom:4px;"><i class="fa-solid fa-check"></i> Duyệt xong</button>` 
                : '';

            let productsHtml = `<table class="display-item-table">`;
            if (i.products) {
                i.products.forEach(p => {
                    productsHtml += `
                        <tr>
                            <td><strong>${p.content}</strong></td>
                            <td style="text-align:center; color:var(--text-muted); padding: 0 8px;">x${p.qty}</td>
                            <td style="text-align:right;">${(p.qty * p.price).toLocaleString('vi-VN')}đ</td>
                        </tr>`;
                });
            }
            
            const currentVat = i.vatPercent !== undefined ? i.vatPercent : 8;
            productsHtml += `
                <tr style="font-weight:700; border-top: 1px dashed var(--card-border);">
                    <td colspan="2" style="padding-top: 4px;">Cộng (VAT ${currentVat}%):</td>
                    <td style="text-align:right; color:var(--accent-red); padding-top: 4px;">${(i.totalCost || i.subtotal || 0).toLocaleString('vi-VN')}đ</td>
                </tr>
            </table>`;

            html += `
            <tr style="background: var(--card-bg);">
                <td style="padding-left: 20px;">${productsHtml}</td>
                <td>
                    <span class="badge ${i.status === 'Hoàn thành' ? 'badge-danger' : ''}">${i.status}</span>
                </td>
                <td style="font-size:0.82rem; font-weight:700; color:var(--text-main);">
                    <i class="fa-regular fa-clock" style="color:#0088ff; margin-right:4px;"></i> ${i.createdAt || 'N/A'}
                </td>
                <td>
                    <div style="margin-bottom:4px;">${fileDisplay}</div>
                    ${redInvoiceDisplay}
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        ${approveAction}
                        <div style="display:flex; gap:8px; margin-top:4px;">
                            <button onclick="openInvoiceModal('${i.id}')" title="Sửa dữ liệu" style="background:none; border:none; color:#0088ff; cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="deleteInvoice('${i.id}')" title="Xóa dữ liệu" style="background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </td>
            </tr>`;
        });
    });

    tbody.innerHTML = html;
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker đăng ký thành công!', reg))
        .catch((err) => console.log('Đăng ký Service Worker thất bại:', err));
    });
}

// ==================== XỬ LÝ MENU MOBILE TRƯỢT XUỐNG ====================
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navContainer = document.querySelector('.nav-container');

    if (mobileMenuToggle && navContainer) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navContainer.classList.toggle('mobile-active');
            
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (navContainer.classList.contains('mobile-active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!navContainer.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navContainer.classList.remove('mobile-active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
});