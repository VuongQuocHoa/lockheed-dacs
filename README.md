# 🚀 LOCKHEED DACS — Xưởng Lắp Ráp Tên Lửa & Đánh Chặn 3D (WebGL / Three.js)

> **Hệ thống mô phỏng đồ họa 3D hàng không vũ trụ: Tự tay lắp ráp tên lửa 6 mô-đun & Hệ thống điều khiển đánh chặn xung lực ngang Lockheed Martin DACS (Divert and Attitude Control System)**

Dự án mô phỏng thời gian thực xây dựng bằng **Three.js (WebGL)**, tích hợp vật lý động học bay, định luật dẫn đường tỷ lệ (Proportional Navigation), hệ thống điều hướng khí nén xung lực ngang DACS bẻ hướng tức thời và cơ chế điều khiển góc nhìn thứ 3 (TPS PUBG/Free Fire) với con trỏ khóa mục tiêu.

---

## 🌟 Tính Năng Kỹ Thuật Nổi Bật

### 1. 🛠️ Xưởng Lắp Ráp 6 Mô-Đun Bắt Buộc (Modular DIY Rocket Assembly)
Trước khi khai hỏa, người dùng phải tự tay lựa chọn và lắp ráp chuẩn xác 6 bộ phận theo cấu trúc khí động học:
1. **Vòi phun động cơ đẩy chính:** Động cơ nhiên liệu rắn (Lửa vàng 42kN) hoặc Động cơ Plasma siêu thanh (Lửa xanh 50kN, Mach 5.5).
2. **Cánh đuôi khí động học:** Cánh QCC ổn định cao hoặc Cánh chữ thập đen cơ động gắt bám mục tiêu.
3. **Thân chứa nhiên liệu chính:** Thân trắng Explorer hoặc Thân xám tàng trữ hợp kim giảm cản gió.
4. **Ống dẫn khí & Đẩy phụ hông:** 4 cánh dẫn khí dọc thân QCC hoặc 2 ống booster đẩy gia tốc ban đầu.
5. **Khoang phun khí $O_2$ ngang Lockheed DACS:** Vòng 8 vòi phun khí áp suất cao vuông góc thân tên lửa hoặc DACS kết hợp cánh mũi Canard.
6. **Mũi dò mục tiêu & Đầu đạn:** Mũi nhọn radar chủ động khóa UAV hoặc Mũi Radome tầm nhiệt đa phổ.

### 2. 💨 Công Nghệ Phun Xung Lực Ngang DACS (Divert & Attitude Control System)
- Khi bay với tốc độ siêu thanh (Mach 3 - Mach 5), cánh lái truyền thống bị giảm hiệu quả do sóng xung kích. 
- Hệ thống **Lockheed DACS** sử dụng các van xả khí $O_2$ vuông góc với trục thân tên lửa, tạo lực đẩy ngang (Divert Force) dịch chuyển tức thời trọng tâm và bẻ góc mũi tên lửa về phía mục tiêu di động mà không cần chờ xoay toàn bộ thân.

### 3. 🎮 Trải Nghiệm Điều Khiển Chuột TPS Chuẩn PUBG / Free Fire
- Tích hợp **Pointer Lock API**: Di chuột đến đâu, camera đuôi và đầu tên lửa bẻ ngoặt về hướng đó.
- Bấm phím **[ALT]** để mở khóa con trỏ tự do chọn menu, hoặc bấm vào canvas để khóa tâm ngắm.
- **Bullet-Time Slow-Mo [Q / Chuột Phải]:** Làm chậm thời gian xuống 0.2x để người chơi thực hiện các pha bẻ hướng né tránh hoặc đánh chặn mục tiêu ngoạn mục.

### 4. 👁️ 4 Chế Độ Góc Nhìn Camera & HUD Điện Tử
- **Camera TPS (Mặc định):** Đuôi tên lửa góc nhìn thứ ba kèm tâm ngắm Crosshair.
- **Camera FPV Đầu Dò Seeker:** Góc nhìn từ mắt radar trên mũi tên lửa với HUD hiển thị vòng khóa mục tiêu, độ tin cậy AI, cự ly (Range), và điểm đón đường đạn (Lead Reticle).
- **Camera Tự Do 360° & Camera Cạnh Ngang Hành Trình.**

### 5. 🔊 Bộ Tổng Hợp Âm Thanh Thủ Tục (WebAudio Sound Engine)
- Toàn bộ âm thanh tiếng gầm phản lực, tiếng xì xả khí DACS tần số cao, tiếng khớp mô-đun và tiếng nổ va chạm được tổng hợp toán học bằng WebAudio API, không cần tải bất kỳ tệp âm thanh `.mp3` nào từ bên ngoài.

---

## 🚀 Hướng Dẫn Chạy Dự Án

### Cách 1: Chạy trực tiếp (Không cần cài đặt)
Nhấp đúp chuột vào tệp `index.html` để mở ngay trên trình duyệt (Chrome, Edge, Brave, Firefox).

### Cách 2: Chạy qua Node.js Server
```powershell
npm start
```
Truy cập trình duyệt: **http://localhost:8088**

---

## ⌨️ Phím Tắt Điều Khiển

| Phím | Chức năng |
| :--- | :--- |
| **SPACE** | Khai hỏa tên lửa (khi lắp đủ 6/6 bộ phận) / Dừng lại |
| **W / S** | Ngẩng mũi (Phun $O_2$ bụng) / Chúi mũi (Phun $O_2$ lưng) |
| **A / D** | Ngoặt trái (Phun $O_2$ phải) / Ngoặt phải (Phun $O_2$ trái) |
| **ALT** | Bật / Tắt chế độ tự do con trỏ chuột (như game bắn súng) |
| **Q / Chuột phải** | Bật / Tắt hiệu ứng Bullet-Time làm chậm thời gian (Slow-Mo) |
| **C / V** | Chuyển đổi 4 góc nhìn Camera (TPS, FPV Seeker, Orbit, Side) |
| **F** | Bật / Tắt tự động bám mục tiêu (Proportional Navigation) |
| **R** | Thu hồi tên lửa về bệ phóng để lắp ráp lại |

---

## 📁 Cấu Trúc Thư Mục Chuẩn

```
d:\PROJECTS\lockheed-dacs\
├── index.html          # Giao diện chính 3D WebGL và bảng điều khiển HUD
├── css/
│   └── style.css       # Toàn bộ định dạng giao diện Glassmorphism & Telemetry
├── js/
│   ├── audio.js        # Bộ tổng hợp âm thanh WebAudio không cần file mp3
│   └── app.js          # Khởi tạo Three.js, lắp ráp mô-đun, vật lý DACS & vòng lặp game
├── assets/             # Tài nguyên và hình ảnh mô tả
├── package.json        # Cấu hình dự án & scripts npm
├── server.js           # Máy chủ tĩnh Node.js siêu nhẹ
├── README.md           # Tài liệu kỹ thuật chi tiết
└── .gitignore          # Cấu hình bỏ qua tệp tạm
```
