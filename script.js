// 1. Cấu hình các đường dẫn Google Sheets
const URL_THU_MUA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsl9LECSCDb82qUb7iIEU67XDtOsIeGBEXytLelidtSZCMgLKqcsRBUp1ZEMGOLccOz3kOB4KT65xq/pub?gid=0&output=csv';
const URL_SAN_XUAT = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsl9LECSCDb82qUb7iIEU67XDtOsIeGBEXytLelidtSZCMgLKqcsRBUp1ZEMGOLccOz3kOB4KT65xq/pub?gid=1824078467&single=true&output=csv';
const URL_LOT_INFO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsl9LECSCDb82qUb7iIEU67XDtOsIeGBEXytLelidtSZCMgLKqcsRBUp1ZEMGOLccOz3kOB4KT65xq/pub?gid=472003237&output=csv';

// Hàm tải và xử lý CSV
async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể tải dữ liệu');
        const data = await response.text();
        return data.split(/\r?\n/)
            .filter(row => row.trim() !== '')
            .map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(cell => cell.replace(/"/g, '').trim()));
    } catch (err) {
        console.error("Lỗi Fetch:", err);
        return [];
    }
}

// --- PHẦN 1: TRUY XUẤT NGƯỢC (TỪ SẢN PHẨM VỀ NGUYÊN LIỆU) ---
window.searchData = async function() {
    const keyword = document.getElementById('searchInput').value.trim().toUpperCase();
    const container = document.getElementById('dashboard-view');
    
    if (!keyword) return alert("Vui lòng nhập Số Lô Thành Phẩm!");

    container.innerHTML = '<div class="empty-welcome"><i class="fas fa-spinner fa-spin"></i><p>Đang truy xuất ngược...</p></div>';

    try {
        const [rowsTM, rowsSX, rowsLot] = await Promise.all([
            fetchCSV(URL_THU_MUA), fetchCSV(URL_SAN_XUAT), fetchCSV(URL_LOT_INFO)
        ]);

        const materials = rowsTM.filter(row => row[6] === keyword);
        const prodSteps = rowsSX.filter(row => row[0] === keyword);
        const lotData = rowsLot.find(row => row[0] === keyword);

        if (!lotData && prodSteps.length === 0) {
            container.innerHTML = `<div class="empty-welcome"><h3>Không tìm thấy lô sản phẩm: ${keyword}</h3></div>`;
            return;
        }

        renderTraceBack(materials, prodSteps, lotData);
        document.getElementById('last-update').innerText = "Chế độ: Truy xuất Ngược | " + new Date().toLocaleTimeString();
    } catch (e) {
        container.innerHTML = '<div class="empty-welcome">Lỗi kết nối dữ liệu.</div>';
    }
};

// --- PHẦN 2: TRUY XUẤT XUÔI (TỪ NGUYÊN LIỆU RA SẢN PHẨM) ---
window.searchForward = async function() {
    const keyword = document.getElementById('searchMaterialInput').value.trim().toUpperCase();
    const container = document.getElementById('dashboard-view');
    
    if (!keyword) return alert("Vui lòng nhập Mã Nguyên Liệu!");

    container.innerHTML = '<div class="empty-welcome"><i class="fas fa-route fa-spin"></i><p>Đang truy xuất xuôi...</p></div>';

    try {
        const [rowsTM, rowsSX] = await Promise.all([fetchCSV(URL_THU_MUA), fetchCSV(URL_SAN_XUAT)]);

        // Tìm thông tin nguyên liệu gốc
        const matInfo = rowsTM.find(row => row[1] === keyword || row[6] === keyword || row[2] === keyword);
        // Tìm tất cả các lô sản xuất có sử dụng mã này (Quét cột C - index 2)
        const relatedSteps = rowsSX.filter(row => row[2] === keyword);

        if (!matInfo || relatedSteps.length === 0) {
            container.innerHTML = `<div class="empty-welcome"><h3>Không thấy lịch sử sử dụng cho mã: ${keyword}</h3></div>`;
            return;
        }

        renderTraceForward(matInfo, relatedSteps);
        document.getElementById('last-update').innerText = "Chế độ: Truy xuất Xuôi | " + new Date().toLocaleTimeString();
    } catch (e) {
        container.innerHTML = '<div class="empty-welcome">Lỗi kết nối dữ liệu.</div>';
    }
};

// Hàm hiển thị Truy xuất Ngược (3 Giai đoạn)
function renderTraceBack(materials, prodSteps, lot) {
    const container = document.getElementById('dashboard-view');
    
    const matHtml = materials.map(m => `
        <div class="stat-item" style="border-left:3px solid #27ae60">
            <label>${m[1]}</label><span>NCC: ${m[2]}</span><small>Ngày nhập: ${m[0]}</small>
        </div>`).join('');

    const prodRows = prodSteps.map(p => `
        <tr>
            <td><b>${p[1]}</b></td>
            <td>${p[2]}</td> <td>${p[3]}</td> <td><small>${p[5]} ${p[4]} → ${p[7]} ${p[6]}</small></td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card card-full">
            <div class="card-header"><i class="fas fa-box-open"></i> THÀNH PHẨM: ${lot ? lot[0] : 'N/A'}</div>
            <div class="stat-grid">
                <div class="stat-item"><label>Sản lượng</label><span>${lot ? lot[1] : '---'}</span></div>
                <div class="stat-item"><label>Hạn dùng</label><span>${lot ? lot[2] : '---'}</span></div>
                <div class="stat-item"><label>Khách hàng</label><span>${lot ? lot[3] : '---'}</span></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><i class="fas fa-leaf"></i> NGUYÊN LIỆU ĐẦU VÀO</div>
            <div class="stat-grid">${matHtml || 'Chưa cập nhật'}</div>
        </div>
        <div class="card">
            <div class="card-header"><i class="fas fa-cogs"></i> QUY TRÌNH SẢN XUẤT</div>
            <table>
                <thead><tr><th>Bước</th><th>Số lượng</th><th>Thông số</th><th>Thời gian</th></tr></thead>
                <tbody>${prodRows || '<tr><td colspan="4">N/A</td></tr>'}</tbody>
            </table>
        </div>`;
}

// Hàm hiển thị Truy xuất Xuôi (Gom nhóm lô sản phẩm)
function renderTraceForward(mat, steps) {
    const container = document.getElementById('dashboard-view');
    
    const summary = steps.reduce((acc, row) => {
        if (!acc[row[0]]) acc[row[0]] = { qty: 0, steps: [] };
        acc[row[0]].qty += parseFloat(row[3]) || 0;
        acc[row[0]].steps.push(row[1]);
        return acc;
    }, {});

    const listHtml = Object.keys(summary).map(batch => `
        <div class="stat-item" style="border-left: 5px solid #2ecc71">
            <label>LÔ SẢN PHẨM</label>
            <span class="highlight-text">${batch}</span>
            <p>Sử dụng: ${summary[batch].qty} | Công đoạn: ${[...new Set(summary[batch].steps)].join(', ')}</p>
            <button class="btn-mini" onclick="autoView('${batch}')">Xem chi tiết lô</button>
        </div>`).join('');

    container.innerHTML = `
        <div class="card card-full">
            <div class="card-header"><i class="fas fa-seedling"></i> NGUYÊN LIỆU GỐC: ${mat[1]}</div>
            <div class="stat-grid">
                <div class="stat-item"><label>Nhà cung cấp</label><span>${mat[2]}</span></div>
                <div class="stat-item"><label>Mã hệ thống</label><span>${mat[6]}</span></div>
                <div class="stat-item"><label>Ngày nhập</label><span>${mat[0]}</span></div>
            </div>
        </div>
        <div class="card card-full">
            <div class="card-header"><i class="fas fa-project-diagram"></i> CÁC SẢN PHẨM SỬ DỤNG NGUYÊN LIỆU NÀY</div>
            <div class="stat-grid">${listHtml}</div>
        </div>`;
}

// Hàm bổ trợ kết nối 2 chiều
window.autoView = function(id) {
    document.getElementById('searchInput').value = id;
    window.searchData();
};
