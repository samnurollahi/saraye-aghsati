# MVP سیستم وام‌دهی لوازم خانگی

## خلاصه پروژه
یک پلتفرم وام‌دهی آنلاین برای خرید لوازم خانگی. کاربران درخواست وام می‌دهند، ادمین درخواست را بررسی و در صورت تایید، وام با مبلغ، سود و اقساط مشخص تخصیص می‌دهد. فروشگاه‌ها در سیستم ثبت‌نام می‌کنند و QR Code دریافت می‌کنند. کاربر با اسکن QR Code فروشگاه، می‌تواند از موجودی وام خود به فروشگاه پول واریز کند. بازپرداخت وام از طریق درگاه پرداخت انجام نمی‌شود؛ کاربر اعلان دریافت می‌کند، ادمین تماس می‌گیرد و پس از دریافت پول، پرداخت را در پنل ادمین تایید می‌کند.

---

## Tech Stack

| لایه       | تکنولوژی                          |
|------------|-----------------------------------|
| Frontend   | React + Vite + MUI + Tailwind CSS |
| Backend    | NestJS + TypeORM + PostgreSQL     |
| Auth       | JWT (Access + Refresh Token)      |
| QR Code    | `qrcode` (backend) + `html5-qrcode` یا `react-qr-reader` (frontend) |
| State      | React Query + Zustand (اختیاری)   |
| Validation | class-validator (Nest) + Zod/Yup (React) |

---

# فاز ۱: هسته وام‌دهی و پنل‌های پایه

**هدف فاز ۱:**  
کاربر بتواند درخواست وام بدهد، ادمین درخواست را بررسی و تایید/رد کند و در صورت تایید، وام با شرایط مشخص تخصیص دهد. همچنین پنل ادمین و پنل کاربر پایه آماده شود.

### ۱. نقش‌ها (Roles)
- `user` (وام‌گیرنده)
- `admin`

### ۲. موجودیت‌ها (Entities)

#### User
- id
- fullName
- nationalCode (کد ملی - یکتا)
- phone
- email (اختیاری)
- password (hashed)
- role (`user` | `admin`)
- isActive
- createdAt, updatedAt

#### LoanRequest
- id
- userId
- requestedAmount (مبلغ درخواستی)
- purpose (توضیح نیاز)
- status: `pending` | `approved` | `rejected`
- adminNote (یادداشت ادمین)
- reviewedBy (adminId)
- reviewedAt
- createdAt, updatedAt

#### Loan
- id
- userId
- loanRequestId
- principalAmount (مبلغ اصل وام)
- interestRate (درصد سود)
- totalAmount (اصل + سود)
- installmentCount (تعداد اقساط)
- installmentAmount (مبلغ هر قسط)
- startDate
- status: `active` | `completed` | `defaulted`
- remainingBalance
- createdAt, updatedAt

#### Installment
- id
- loanId
- installmentNumber
- dueDate
- amount
- status: `pending` | `paid` | `overdue`
- paidAt (nullable)
- paidConfirmedBy (adminId - nullable)
- createdAt, updatedAt

### ۳. APIهای فاز ۱

#### Auth
- `POST /auth/register` (فقط نقش user)
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

#### User (وام‌گیرنده)
- `POST /loan-requests` → ایجاد درخواست وام
- `GET /loan-requests/me` → لیست درخواست‌های خودم
- `GET /loans/me` → لیست وام‌های فعال و تاریخچه
- `GET /loans/:id/installments` → اقساط یک وام

#### Admin
- `GET /admin/loan-requests?status=pending` → لیست درخواست‌ها (فیلتر)
- `GET /admin/loan-requests/:id`
- `PATCH /admin/loan-requests/:id/approve`  
  Body: `{ principalAmount, interestRate, installmentCount, startDate, adminNote }`
- `PATCH /admin/loan-requests/:id/reject`  
  Body: `{ adminNote }`
- `GET /admin/loans`
- `GET /admin/loans/:id`
- `GET /admin/users`

### ۴. منطق کسب‌وکار فاز ۱
1. کاربر ثبت‌نام و لاگین می‌کند.
2. درخواست وام ایجاد می‌کند (مبلغ و توضیح).
3. ادمین درخواست را می‌بیند.
4. در صورت تایید:
   - یک رکورد `Loan` ساخته می‌شود.
   - تعداد اقساط مشخص‌شده به صورت خودکار `Installment` ساخته می‌شوند (با dueDate متوالی ماهانه).
   - `remainingBalance = totalAmount`
5. کاربر می‌تواند وام و اقساط خود را ببیند.
6. وضعیت اقساط در این فاز فقط نمایش داده می‌شود (پرداخت واقعی در فاز ۲).

### ۵. Frontend فاز ۱

#### صفحات عمومی
- Login / Register

#### پنل کاربر
- Dashboard (خلاصه وام‌های فعال + درخواست‌های در انتظار)
- فرم درخواست وام جدید
- لیست درخواست‌های من
- لیست وام‌های من + جزئیات + جدول اقساط

#### پنل ادمین
- Dashboard (تعداد درخواست‌های در انتظار، وام‌های فعال)
- لیست درخواست‌های وام (با فیلتر status)
- صفحه بررسی درخواست (تایید با فرم شرایط وام / رد)
- لیست همه وام‌ها
- لیست کاربران

#### UI/UX نکات
- استفاده کامل از MUI (DataGrid برای جداول، Dialog، Form، Snackbar)
- Tailwind فقط برای utilityهای ریز و spacing
- Responsive (موبایل اول)

### ۶. معیارهای اتمام فاز ۱
- [ ] ثبت‌نام و لاگین کامل کار می‌کند
- [ ] کاربر می‌تواند درخواست وام بدهد
- [ ] ادمین می‌تواند درخواست را تایید یا رد کند
- [ ] با تایید، وام و اقساط به درستی ساخته می‌شوند
- [ ] کاربر وام و اقساط خود را می‌بیند
- [ ] پنل ادمین لیست‌ها را به درستی نمایش می‌دهد
- [ ] نقش‌ها به درستی محافظت شده‌اند (Guard)

---

# فاز ۲: فروشگاه‌ها، QR Code و مصرف وام + بازپرداخت

**هدف فاز ۲:**  
فروشگاه‌ها ثبت‌نام کنند و QR Code بگیرند. کاربر با اسکن QR بتواند از موجودی وام خود به فروشگاه پول منتقل کند. سیستم اعلان بازپرداخت بدهد و ادمین بتواند پرداخت اقساط را تایید کند.

### ۱. موجودیت‌های جدید

#### Shop
- id
- name
- ownerName
- phone
- address
- description
- qrCodeToken (یکتا - UUID یا کد تصادفی)
- isActive
- createdAt, updatedAt

#### Transaction (مصرف وام)
- id
- userId
- loanId
- shopId
- amount
- description (اختیاری)
- status: `completed` | `failed`
- createdAt

### ۲. APIهای فاز ۲

#### Shop (ادمین)
- `POST /admin/shops` → ایجاد فروشگاه
- `GET /admin/shops`
- `PATCH /admin/shops/:id`
- `DELETE /admin/shops/:id` (یا soft delete)
- `GET /admin/shops/:id/qr` → دریافت تصویر/داده QR

#### Shop (کاربر)
- `GET /shops/scan/:qrCodeToken` → اطلاعات فروشگاه با اسکن QR
- `POST /transactions` → انتقال پول از وام به فروشگاه  
  Body: `{ shopId, amount, description? }`

#### بازپرداخت (ادمین)
- `GET /admin/installments?status=pending&dueBefore=...`
- `PATCH /admin/installments/:id/confirm-payment`  
  Body: `{ paidAt? }`

#### کاربر
- `GET /notifications` یا اعلان‌های داخل داشبورد (اقساط نزدیک به سررسید یا overdue)

### ۳. منطق کسب‌وکار فاز ۲

#### مصرف وام (خرید از فروشگاه)
1. فروشگاه توسط ادمین ساخته می‌شود → `qrCodeToken` یکتا تولید می‌شود.
2. کاربر QR را اسکن می‌کند → اطلاعات فروشگاه نمایش داده می‌شود.
3. کاربر مبلغ مورد نظر را وارد می‌کند.
4. سیستم چک می‌کند:
   - وام فعال داشته باشد
   - `remainingBalance >= amount`
5. در صورت تایید:
   - یک `Transaction` ساخته می‌شود
   - `remainingBalance` وام کم می‌شود
   - در صورت نیاز، منطق تخصیص به اقساط (اختیاری در MVP)

#### بازپرداخت
1. سیستم به صورت روزانه/هفتگی اقساط نزدیک به سررسید را پیدا می‌کند.
2. در داشبورد کاربر و اعلان‌ها نمایش داده می‌شود: «قسط شماره X سررسید شده / نزدیک است».
3. ادمین با کاربر تماس می‌گیرد و پول را دریافت می‌کند.
4. ادمین در پنل، قسط را `confirm-payment` می‌کند:
   - `status = paid`
   - `paidAt` ثبت می‌شود
   - `remainingBalance` وام به‌روز می‌شود (کم می‌شود)

> توجه: هیچ درگاه پرداختی وجود ندارد. همه چیز دستی و از طریق تماس ادمین است.

### ۴. Frontend فاز ۲

#### پنل ادمین
- مدیریت فروشگاه‌ها (CRUD)
- صفحه تولید و نمایش QR Code فروشگاه (قابل دانلود/چاپ)
- لیست اقساط (فیلتر pending / overdue)
- دکمه «تایید دریافت وجه» روی هر قسط

#### پنل کاربر
- بخش «خرید با وام» / «اسکن QR»
  - دوربین اسکن QR
  - نمایش اطلاعات فروشگاه
  - فرم مبلغ + دکمه پرداخت از وام
- داشبورد به‌روز شده:
  - موجودی باقی‌مانده وام
  - اعلان اقساط نزدیک/سررسید شده
- لیست تراکنش‌های انجام‌شده با فروشگاه‌ها

### ۵. نکات فنی مهم فاز ۲
- QR Code باید حاوی یک token یکتا باشد (نه id مستقیم) برای امنیت بیشتر.
- هنگام انتقال پول، از Transaction و کاهش موجودی در یک Transaction دیتابیسی استفاده شود (Atomic).
- محدودیت: کاربر فقط از وام‌های `active` خود می‌تواند خرج کند.
- اگر `remainingBalance` صفر شد، وضعیت وام به `completed` تغییر کند.

### ۶. معیارهای اتمام فاز ۲
- [ ] ادمین می‌تواند فروشگاه بسازد و QR دریافت کند
- [ ] کاربر QR را اسکن می‌کند و اطلاعات فروشگاه را می‌بیند
- [ ] کاربر می‌تواند از موجودی وام به فروشگاه پول منتقل کند
- [ ] موجودی وام به درستی کم می‌شود
- [ ] اعلان اقساط در پنل کاربر نمایش داده می‌شود
- [ ] ادمین می‌تواند پرداخت قسط را تایید کند
- [ ] وضعیت قسط و موجودی وام بعد از تایید درست به‌روز می‌شود

---

# اولویت‌بندی و پیشنهاد اجرا

| اولویت | کار                              | فاز |
|--------|----------------------------------|-----|
| ۱      | Auth + User + Admin پایه         | ۱   |
| ۲      | LoanRequest + تایید ادمین + Loan + Installment | ۱ |
| ۳      | پنل‌های کاربر و ادمین فاز ۱      | ۱   |
| ۴      | Shop + QR Code                   | ۲   |
| ۵      | اسکن QR + Transaction (مصرف وام) | ۲   |
| ۶      | سیستم اعلان و تایید پرداخت اقساط | ۲   |

---

# نکات مشترک برای هر دو Agent

### Backend (NestJS)
- از `class-validator` و `class-transformer` استفاده شود.
- همه endpointها باید Guard داشته باشند (`JwtAuthGuard` + `RolesGuard`).
- از Soft Delete برای موجودیت‌های مهم استفاده شود.
- Pagination در لیست‌ها پیاده‌سازی شود.
- Error Handling استاندارد (Exception Filter).

### Frontend (React + Vite + MUI + Tailwind)
- ساختار پوشه‌ای تمیز: `features/`, `components/`, `hooks/`, `services/`, `types/`
- استفاده از React Query برای data fetching
- Formها با React Hook Form + Zod
- تم MUI سفارشی‌سازی‌شده + Tailwind برای utility
- Loading، Error و Empty State برای همه صفحات
- RTL کامل (فارسی)

### دیتابیس
- PostgreSQL
- Migration با TypeORM
- Index روی فیلدهای پرتکرار (nationalCode, phone, qrCodeToken, statusها)

---

**این سند مبنای کار هر دو Agent فرانت‌اند و بک‌اند است.**  
هر فاز باید به طور کامل و قابل دمو تمام شود قبل از شروع فاز بعدی.  
در صورت ابهام در هر بخش، از این سند به عنوان مرجع اصلی استفاده شود.
```
```html
</body>
</html>
```

فایل Markdown آماده شد.