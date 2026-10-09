# احراز هویت و دسترسی فروشگاه

## معماری پیشین

- هویت‌های احراز هویت‌شده فقط `User` بودند. JWT شامل `sub`، `role` و `tokenUse` بود؛ access برای ۱۵ دقیقه و refresh برای ۷ روز صادر می‌شد.
- رمز کاربران با `bcryptjs` و cost برابر ۱۲ ذخیره می‌شد. refresh token خام در دیتابیس نبود؛ SHA-256 آن ذخیره و هنگام refresh به‌صورت اتمیک چرخانده می‌شد.
- `JwtAuthGuard` هر توکن را به کاربر تبدیل می‌کرد و `RolesGuard` دسترسی را براساس `UserRole` کنترل می‌کرد.
- `Shop` فقط اطلاعات کسب‌وکار، وضعیت فعال‌بودن، حذف نرم و `qrCodeToken` تصادفی داشت. شمارهٔ تلفن فروشگاه در دیتابیس یکتا نبود.
- خرید در `POST /transactions` با هویت کاربر جاری آغاز می‌شد. سرویس، فروشگاه فعال و وام فعال متعلق به همان کاربر را کنترل و تراکنش را ثبت می‌کرد.

## مدل حساب فروشگاه

اطلاعات حساب در جدول مستقل `shop_accounts` است تا اطلاعات کسب‌وکار از رمز، refresh hash و setup-token hash جدا بماند. هر ردیف دقیقاً به یک فروشگاه وصل است. `shopId`، `loginPhone` و setup-token hash ایندکس یکتا دارند. خود جدول `shops` یکتایی جدیدی روی phone نمی‌گیرد؛ بنابراین وجود شماره‌های تکراری قدیمی migration را متوقف نمی‌کند. یکتایی شماره هنگام provisioning اعمال می‌شود و در صورت تعارض، عملیات با `409 Conflict` رد خواهد شد.

فروشگاه بدون ردیف account یا بدون password hash نمی‌تواند login کند. ورود با شماره‌ای انجام می‌شود که هنگام provisioning از phone فروشگاه برداشته و ارقام فارسی/عربی آن به ارقام لاتین تبدیل می‌شود. تغییر phone از API مدیریت فروشگاه، شمارهٔ login حساب provision‌شده را نیز در همان تراکنش به‌روزرسانی می‌کند.

رمز با `bcryptjs` و cost برابر ۱۲ hash می‌شود. setup token با ۳۲ بایت تصادفی ساخته می‌شود، فقط hash SHA-256 آن ذخیره و پس از ۳۰ دقیقه منقضی می‌شود. ثبت رمز با update شرطی انجام می‌شود و hash و تاریخ انقضا را پاک می‌کند؛ در نتیجه مصرف مجدد یا رقابت دو درخواست موفق نمی‌شود. token خام فقط یک بار در پاسخ endpoint مدیر نشان داده می‌شود.

## هویت و توکن

JWT کاربران جدید دارای claimهای `sub`، `role`، `principalType: "user"` و `tokenUse` است. برای سازگاری تا پایان عمر توکن، guard کاربران توکن‌های قدیمی فاقد `principalType` را هم user می‌داند. توکن فروشگاه `sub` برابر UUID فروشگاه و `principalType: "shop"` دارد و `role` کاربری ندارد. سرویس امضای مشترک همان access/refresh secretهای فعلی و همان انقضاها را استفاده می‌کند.

`JwtAuthGuard` فقط principal کاربر می‌سازد؛ `ShopJwtAuthGuard` فقط principal فروشگاه می‌سازد و در هر درخواست فعال‌بودن، حذف‌نشدن و تکمیل credential را از دیتابیس بررسی می‌کند. در نتیجه خاموش یا soft-delete کردن فروشگاه فوراً دسترسی APIهای shop را می‌بندد. guardهای نقش admin/user تغییر سطح دسترسی نمی‌دهند.

Refresh فروشگاه در `POST /shop-auth/refresh` پشتیبانی می‌شود. refresh token خام فقط به کلاینت داده می‌شود؛ hash آن در ردیف حساب می‌ماند و هر بار با update شرطی rotate می‌شود. endpoint logout در سامانهٔ قبلی وجود نداشت و این پیاده‌سازی هم logout صوری اضافه نمی‌کند: access token تا ۱۵ دقیقه stateless است؛ refresh token تا rotation یا غیرفعال‌شدن فروشگاه قابل استفاده می‌ماند. محدودسازی نرخ برای login و setup در پروژه وجود ندارد و در این تغییر اضافه نشده است.

## API جدید

Base path برنامه در وضعیت فعلی `/` است؛ global prefix تعریف نشده. درخواست‌های محافظت‌شده از `Authorization: Bearer <accessToken>` استفاده می‌کنند. پاسخ خطای اعتبارسنجی مطابق `ValidationPipe` سراسری، `400` و پیام‌های فارسی است.

### ورود فروشگاه

`POST /shop-auth/login`، بدون احراز هویت، پاسخ موفق `200`.

```json
{
  "identifier": "09123456789",
  "password": "StrongPass123"
}
```

ارقام فارسی و عربی در شماره به لاتین تبدیل می‌شوند. شماره باید پس از تبدیل با `09` و ۱۱ رقم باشد؛ رمز ۸ تا ۷۲ کاراکتر است.

```json
{
  "accessToken": "<shop-access-jwt>",
  "refreshToken": "<shop-refresh-jwt>",
  "shop": {
    "id": "6b2d98f2-82e8-4ac5-8f32-646888a4f3bb",
    "name": "فروشگاه نمونه",
    "ownerName": "علی رضایی",
    "phone": "09123456789",
    "address": "تهران",
    "description": null,
    "isActive": true,
    "createdAt": "2026-10-08T12:00:00.000Z",
    "updatedAt": "2026-10-08T12:00:00.000Z"
  }
}
```

شناسه ناشناخته، رمز اشتباه، فروشگاه غیرفعال/حذف‌شده یا حساب provision‌نشده همگی `401` با پیام عمومی یکسان می‌دهند. payload نامعتبر از نظر قالب `400` است.

### صدور دسترسی اولیه توسط مدیر

`POST /admin/shops/{id}/credentials/setup-token`، فقط مدیر با access token کاربری و نقش admin؛ پاسخ `201`.

Header: `Authorization: Bearer <admin-access-token>`.

بدنه ندارد. فروشگاه باید وجود داشته و فعال باشد. پاسخ فقط همین بار توکن خام setup را می‌دهد؛ آن را از کانال امن به مسئول مجاز فروشگاه برسانید و در log یا فهرست فروشگاه‌ها ثبت نکنید.

```json
{
  "setupToken": "<43-character-random-token>",
  "loginIdentifier": "09123456789",
  "expiresAt": "2026-10-08T12:30:00.000Z"
}
```

شمارهٔ login تکراری در حساب‌های provision‌شده یا تلاش برای راه‌اندازی مجدد حساب دارای رمز `409` می‌دهد. برای shopهای قدیمی هیچ credential پیش‌فرض ساخته نمی‌شود. شماره‌های تکراری در جدول shops نیازمند تصمیم/پاک‌سازی دستی مدیر پیش از provisioning یکی از حساب‌های متعارض است.

### ثبت رمز اولیه

`POST /shop-auth/setup-password`، بدون احراز هویت، پاسخ موفق `200`.

```json
{
  "setupToken": "<setup-token-from-admin-response>",
  "password": "StrongPass123"
}
```

```json
{
  "message": "رمز عبور فروشگاه با موفقیت تنظیم شد."
}
```

توکن نامعتبر، منقضی، مصرف‌شده، یا متعلق به فروشگاه غیرفعال/حذف‌شده `401` می‌دهد. رمز باید ۸ تا ۷۲ کاراکتر باشد؛ پس از این مرحله login ممکن است.

### تمدید token

`POST /shop-auth/refresh`، بدون access token، پاسخ موفق `200`.

```json
{
  "refreshToken": "<shop-refresh-jwt>"
}
```

پاسخ موفق همان ساختار login است، با access و refresh tokenهای تازه. refresh قدیمی پس از استفاده رد می‌شود؛ توکن user/admin به‌عنوان refresh فروشگاه پذیرفته نمی‌شود. توکن نامعتبر یا مصرف‌شده `401` است.

### پروفایل جاری

`GET /shop-auth/me`، نیازمند shop access token.

```http
Authorization: Bearer <shop-access-token>
```

پاسخ `200` همان شیء `shop` در پاسخ login است. این پاسخ QR token، password hash و refresh hash ندارد. شناسه از JWT می‌آید و هیچ `shopId` از درخواست پذیرفته نمی‌شود.

### خلاصهٔ dashboard

`GET /shop-auth/dashboard`، نیازمند shop access token.

```json
{
  "shop": {
    "id": "6b2d98f2-82e8-4ac5-8f32-646888a4f3bb",
    "name": "فروشگاه نمونه",
    "ownerName": "علی رضایی",
    "phone": "09123456789",
    "address": "تهران",
    "description": null,
    "isActive": true,
    "createdAt": "2026-10-08T12:00:00.000Z",
    "updatedAt": "2026-10-08T12:00:00.000Z"
  },
  "transactionCount": 12,
  "totalTransactionAmount": "150000000.00",
  "recentTransactions": [
    {
      "id": "9c58b4dd-7d61-44a7-a8a7-e2f8c576034e",
      "amount": "12500000.00",
      "description": null,
      "status": "completed",
      "createdAt": "2026-10-08T12:00:00.000Z"
    }
  ]
}
```

count و مبلغ فقط برای تراکنش‌های `completed` همان فروشگاه هستند؛ `recentTransactions` حداکثر پنج مورد اخیر است. مبلغ‌ها رشتهٔ decimal هستند. دادهٔ مشتری یا وام در پاسخ نیست.

### تاریخچهٔ تراکنش فروشگاه

`GET /shop-auth/transactions?page=1&limit=20`، نیازمند shop access token. `page` حداقل ۱ و `limit` بین ۱ و ۱۰۰ است؛ پیش‌فرض‌ها ۱ و ۲۰.

```json
{
  "items": [
    {
      "id": "9c58b4dd-7d61-44a7-a8a7-e2f8c576034e",
      "amount": "12500000.00",
      "description": null,
      "status": "completed",
      "createdAt": "2026-10-08T12:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

تمام وضعیت‌های ثبت‌شدهٔ تراکنش ممکن است در history باشند. query همیشه با shopId برگرفته از JWT محدود است و `userId`، شناسهٔ وام یا شناسهٔ shop دیگری برگردانده/پذیرفته نمی‌شود.

## endpointهای قبلی بدون تغییر

- `POST /admin/shops` همچنان shop تجاری را می‌سازد و credential یا setup token نمی‌سازد.
- `GET /admin/shops`، `PATCH /admin/shops/:id`، `DELETE /admin/shops/:id` و `GET /admin/shops/:id/qr` قرارداد قبلی را حفظ می‌کنند. تغییر phone حساب provision‌شده را همزمان به‌روز می‌کند.
- `GET /shops/scan/:qrCodeToken` همچنان public است و همان اطلاعات عمومی فروشگاه فعال را می‌دهد. QR فقط برای شناسایی فروشگاه در جریان کاربر است و احراز هویت نیست.
- `POST /transactions` و `GET /transactions/me` همان جریان کاربر را دارند. خرید همچنان از سمت کاربر واردشده انجام می‌شود؛ endpoint ایجاد تراکنش از ترمینال فروشگاه اضافه نشده است.
- shopها اجازهٔ تأیید اقساط، تغییر ماندهٔ وام، مدیریت shopها یا دسترسی به مسیرهای user/admin ندارند.

## گردش کار عملیاتی

1. مدیر با `POST /admin/shops` فروشگاه را می‌سازد؛ این مرحله login را فعال نمی‌کند.
2. مدیر `POST /admin/shops/{id}/credentials/setup-token` را با توکن admin اجرا می‌کند.
3. مدیر token برگشتی را خارج از log و از کانال امن در اختیار مسئول فروشگاه می‌گذارد؛ در MVP ارسال خودکار SMS/email وجود ندارد.
4. فروشگاه `POST /shop-auth/setup-password` را با token و رمز انتخابی خود اجرا می‌کند. token با موفقیت مصرف‌شده دیگر کار نمی‌کند.
5. فروشگاه با شمارهٔ اعلام‌شده و رمز در `POST /shop-auth/login` وارد می‌شود.
6. frontend، access token را در Bearer header برای `/shop-auth/me`، `/shop-auth/dashboard` و `/shop-auth/transactions` می‌فرستد؛ هنگام انقضای access از refresh token در `/shop-auth/refresh` استفاده می‌کند.
7. غیرفعال‌سازی یا حذف نرم از مدیریت، درخواست‌های محافظت‌شده را حتی با JWT هنوز منقضی‌نشده رد می‌کند.
8. مشتری همچنان QR فروشگاه را اسکن می‌کند و purchase را در API کاربر آغاز می‌کند؛ shop فقط تاریخچهٔ تراکنش‌های منتسب به خودش را می‌خواند.

## راهنمای frontend React/Vite/TypeScript

- API base فعلی ریشهٔ backend است؛ `VITE_API_BASE_URL` را به origin backend تنظیم کنید و مسیرها را دقیقاً با `/shop-auth/...` یا `/admin/shops/...` بسازید.
- ورود: `POST /shop-auth/login` با `{ identifier: string, password: string }`؛ پاسخ type: `{ accessToken: string; refreshToken: string; shop: ShopProfile }`.
- راه‌اندازی رمز: `POST /shop-auth/setup-password` با `{ setupToken: string; password: string }`؛ پاسخ `{ message: string }`.
- صدور setup token فقط در ابزار مدیر: `POST /admin/shops/{id}/credentials/setup-token` با admin bearer؛ پاسخ `{ setupToken: string; loginIdentifier: string; expiresAt: string }`. این token را در URL، analytics یا log قرار ندهید.
- Bearer access token در header `Authorization` ارسال می‌شود؛ backend cookie یا session نمی‌سازد. access عمر ۱۵ دقیقه، refresh عمر ۷ روز و refresh token باید پس از هر refresh با مقدار برگشتی جایگزین شود.
- پاسخ login/refresh، profile و dashboard شامل profile بدون QR و credential است. `ShopProfile` مطابق schema بالا است؛ مبالغ تراکنش `string` decimal و زمان‌ها ISO date-time هستند.
- routeهای ورود/تنظیم رمز public هستند؛ dashboard، profile و تاریخچه فقط با token shop. token user/admin برای آن‌ها معتبر نیست. برای role صفحه از فیلد shop response یا نوع JWT استفاده نکنید؛ وضعیت اعتبار را از پاسخ backend بگیرید.
- `401` را به login برگردانید؛ در درخواست‌های محافظت‌شده می‌توان یک refresh کنترل‌شده انجام داد. refresh fail/reuse باید session frontend را پاک کند. setup token منقضی/مصرف‌شده نیازمند صدور مجدد مدیر است. خطای اعتبارسنجی `400`، تعارض provisioning `409` و دسترسی ناکافی `401/403` است.
- صفحات قابل پیاده‌سازی با API فعلی: login، فرم initial password، پروفایل، dashboard تجمیعی، و تاریخچهٔ صفحه‌بندی‌شده.
- ارسال پیامک/email، فراموشی/تغییر رمز، logout با ابطال فوری access token، rate limit، و ایجاد تراکنش از ترمینال فروشگاه پشتیبانی نمی‌شوند.

## migration و عملیات

migration جدید `1791878400000-CreateShopAccounts` بعد از migrationهای موجود اجرا می‌شود. جدول تازه خالی ساخته می‌شود؛ هیچ shop قدیمی حذف یا بازنویسی نمی‌شود. rollback این migration جدول و indexهای خودش را حذف می‌کند، بنابراین پس از استفادهٔ عملیاتی rollback، اطلاعات credential را پاک خواهد کرد.

پیش از rollout، داده‌های واقعی را برای شماره‌های تکراری shops بررسی کنید و برای فروشگاه‌های متعارض شمارهٔ یکتا تعیین کنید. migration به‌علت شماره‌های تکراری قدیمی شکست نمی‌خورد، اما یکتایی بین credentialهای provision‌شده در سطح دیتابیس enforce می‌شود. پس از migration، مدیران باید برای هر فروشگاه واجد شرایط به‌طور جداگانه setup token صادر کنند.

محدودیت‌های باقیمانده: ارسال setup token دستی است؛ login/setup throttling و چرخهٔ password reset وجود ندارد؛ access JWT stateless تا ۱۵ دقیقه پس از logout فرضی معتبر می‌ماند؛ لاگ دسترسی عملیاتی باید از ثبت bodyهای حساس جلوگیری کند. اسرار `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` باید مانند قبل مستقل و با entropy بالا تنظیم شوند.