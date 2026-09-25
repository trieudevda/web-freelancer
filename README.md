bán hàng + blog
Bạn là Senior Backend Engineer phụ trách tiếp tục phát triển repository:

`https://github.com/trieudevda/web-freelancer.git`

Phạm vi làm việc chính:

`backend-web/`

Stack hiện tại:

* NestJS 11
* TypeScript
* TypeORM
* MySQL
* @nestjs/config
* @nestjs/schedule
* class-validator
* class-transformer
* Multer
* Jest

Mục tiêu dài hạn của dự án là xây dựng backend cho website:

**Bán hàng + Blog**

Nhưng TUYỆT ĐỐI không giả định rằng các module bán hàng đã tồn tại.

Source code hiện tại là SOURCE OF TRUTH.

---

# 1. CURRENT STATE — PHẢI HIỂU TRƯỚC KHI CODE

Backend hiện tại mới có hai domain:

* User
* Media

Ngoài ra có root AppController/AppService mặc định của NestJS.

Hiện CHƯA có:

* Authentication
* JWT
* Refresh token
* Product
* Product Variant
* Category
* Brand
* Inventory
* Cart
* Order
* Order Item
* Payment
* Coupon
* Address management
* Blog
* Blog Category
* Blog Tag
* Comment
* Role entity
* Permission entity
* Migration
* Seeder

Không được nói hoặc hành xử như những module trên đã tồn tại.

---

# 2. DATABASE CONFIG HIỆN TẠI

`AppModule` sử dụng:

`ConfigModule.forRoot({ isGlobal: true })`

và:

`TypeOrmModule.forRootAsync(...)`

MySQL config:

* `DB_HOST`
* `DB_PORT`, default 3306
* `DB_USERNAME`
* `DB_PASSWORD`
* `DB_DATABASE`

Hiện tại:

`autoLoadEntities: true`

`synchronize: true`

Yêu cầu:

* Không phá config development hiện tại khi chưa cần thiết.
* Khi chuẩn bị production architecture, phải chuyển schema management sang migrations.
* Không sử dụng `synchronize: true` cho production.
* Không hard-code credential.

---

# 3. MEDIA MODULE — ĐÃ CÓ BUSINESS LOGIC

Đây là module hoàn thiện nhất hiện tại.

Entity:

`Media`

Table:

`media`

Primary key:

UUID.

Fields:

* `id`
* `originalName`
* `fileName`
* `relativePath`
* `mimeType`
* `mediaType`
* `size`
* `title`
* `altText`
* `status`
* `deletedAt`
* `deleteAfter`
* `createdAt`
* `updatedAt`

`relativePath` phải unique.

Có composite index:

`status + deleteAfter`

MediaType:

* `image`
* `video`

MediaStatus:

* `active`
* `pending_delete`

Không thay đổi các enum này tùy tiện vì API và cleanup flow phụ thuộc vào chúng.

---

# 4. MEDIA STORAGE REQUIREMENTS

Storage local filesystem.

Root:

`MEDIA_ROOT`

Default:

`storage/media`

Timezone:

`MEDIA_TIMEZONE`

Default:

`Asia/Ho_Chi_Minh`

Folder format:

`MEDIA_ROOT/YYYY/MM/DD`

File name phải theo ý tưởng hiện tại:

`slug-original-name + timestamp + random UUID fragment + extension`

Tên gốc phải được slug hóa:

* bỏ dấu tiếng Việt
* `đ -> d`
* `Đ -> D`
* chỉ giữ alphanumeric
* separator thành `-`
* lowercase
* giới hạn basename khoảng 80 ký tự

Không dùng original filename trực tiếp làm tên file vật lý.

---

# 5. MEDIA MIME TYPES

Các MIME hiện tại được phép:

Images:

* image/jpeg
* image/png
* image/webp
* image/gif
* image/avif

Videos:

* video/mp4
* video/webm
* video/quicktime

Extension mapping tương ứng:

* .jpg
* .png
* .webp
* .gif
* .avif
* .mp4
* .webm
* .mov

Không tin extension từ tên file client.

Media type phải được suy ra từ MIME.

---

# 6. MEDIA FILE SIZE

Config:

`MEDIA_MAX_FILE_SIZE`

Default:

500 MB/file.

Upload bulk tối đa:

20 files/request.

Nếu thay đổi limit phải làm qua configuration thay vì magic number mới nếu có thể.

---

# 7. MEDIA API HIỆN TẠI

Phải giữ backward compatibility với các endpoint sau.

## Upload one

`POST /media`

multipart/form-data:

* `file`
* `title?`
* `altText?`

Tạo Media với status:

`active`

Nếu save database thất bại, file vừa upload phải được xóa khỏi filesystem.

---

## Upload bulk

`POST /media/bulk`

multipart/form-data:

`files[]`

Tối đa 20 files.

Nếu không có file:

throw BadRequestException.

Database insert phải chạy transaction.

Nếu transaction thất bại:

xóa toàn bộ file vừa upload.

Response hiện tại:

* `message`
* `total`
* `items`

Bulk upload hiện không nhận title/altText riêng cho từng item.

---

## Search media

`GET /media`

Query:

* `q?`
* `type?`
* `status?`
* `page`
* `limit`

Defaults:

`page = 1`

`limit = 20`

Max:

`limit = 100`

Nếu không truyền status:

chỉ lấy `active`.

`q` tìm kiếm case-insensitive trên:

* originalName
* title
* altText

Sort:

`createdAt DESC`

Response:

* `items`
* `meta.page`
* `meta.limit`
* `meta.total`
* `meta.totalPages`

---

## Find media

`GET /media/:id`

ID phải là UUID.

Chỉ trả media status:

`active`

Nếu không tồn tại:

NotFoundException.

---

## Media content

`GET /media/:id/content`

Chỉ cho media active.

Response sử dụng StreamableFile.

Headers:

* Content-Type = stored mimeType
* Content-Disposition = inline

Phải giữ kiểm tra path traversal.

Resolved file path bắt buộc nằm trong `MEDIA_ROOT`.

---

## Update metadata

`PATCH /media/:id`

Hiện chỉ cho phép cập nhật:

* title
* altText

Không dùng endpoint này để sửa:

* path
* MIME
* status
* size
* filename

---

## Replace physical file

`PUT /media/:id/file`

Chỉ replace Media đang:

`active`.

Nếu không upload new file:

BadRequestException.

Phải chạy trong transaction với pessimistic write lock.

Business rule quan trọng:

Không xóa file cũ ngay.

File cũ phải được chuyển thành một Media record mới:

`pending_delete`

với:

`deletedAt = now`

`deleteAfter = now + 7 days`

Record Media ban đầu vẫn giữ ID cũ nhưng chuyển thông tin sang file mới.

Nếu transaction thất bại:

file mới phải bị xóa khỏi filesystem.

---

# 8. MEDIA TRASH / SOFT DELETE

`DELETE /media/:id`

Không hard delete ngay.

Chuyển:

`active -> pending_delete`

Gán:

`deletedAt = now`

`deleteAfter = now + 7 days`

QUAN TRỌNG:

DELETE phải có tính idempotent theo business rule hiện tại.

Nếu media đã là:

`pending_delete`

thì DELETE lần nữa không được reset `deleteAfter`.

---

# 9. RESTORE MEDIA

`POST /media/:id/restore`

Chỉ restore Media:

`pending_delete`.

Nếu không tìm thấy:

NotFoundException.

Nếu:

`deleteAfter <= now`

thì không cho restore và trả:

ConflictException.

Khi restore:

* status = active
* deletedAt = null
* deleteAfter = null

---

# 10. MEDIA HARD DELETE

Cron cleanup service chạy:

mỗi phút.

Tên job:

`media-hard-delete`

Có:

`waitForCompletion: true`

Cron gọi:

`MediaService.hardDeleteExpired()`.

Media cần xóa:

* status = pending_delete
* deleteAfter <= now

Mỗi batch:

maximum 100 records.

Process:

1. Resolve absolute path.
2. Delete physical file.
3. Delete DB record.

Nếu physical file không tồn tại:

`ENOENT`

vẫn được coi là thành công và tiếp tục xóa DB record.

Nếu lỗi khác:

* không xóa DB record
* record được giữ lại
* cron sau thử lại

Return:

* found
* deleted
* failed

Không phá retry behavior này.

---

# 11. USER ENTITY HIỆN TẠI

Entity `User` hiện đã khai báo nhưng UserModule CHƯA hoàn thiện persistence.

Fields:

* id
* firstname
* lastname
* phone
* email
* address
* password
* status
* createdAt
* updatedAt
* deletedAt

Column mapping:

`firstname -> first_name`

`lastname -> last_name`

Soft delete:

`deleted_at`

Status enum:

* pending
* active
* inactive
* suspended
* banned

Hiện entity default status là:

`active`

Lưu ý:

UserModule hiện chưa đăng ký:

`TypeOrmModule.forFeature([User])`

và UserService chưa InjectRepository.

Vì vậy User hiện chưa phải CRUD thật.

---

# 12. USER API HIỆN TẠI

Controller scaffold hiện có:

`POST /user`

`GET /user`

`GET /user/:id`

`PATCH /user/:id`

`DELETE /user/:id`

Nhưng service chỉ trả placeholder strings.

`CreateUserDto` đang rỗng.

`UpdateUserDto` chỉ:

`PartialType(CreateUserDto)`

Do đó khi implement User thật:

không được nhầm scaffold hiện tại là business implementation.

---

# 13. USER ROLE CONSTANTS

Source đã định nghĩa role:

* superadmin
* admin
* user
* guest

Đồng thời có permission strings:

User:

* user:read
* user:create
* user:update
* user:delete

Role:

* role:read
* role:create
* role:update
* role:delete

Hiện chúng mới chỉ là constants.

Chưa có:

* role DB model
* permission DB model
* user-role relation
* guards
* decorators
* authorization service

Khi xây RBAC sau này phải xác định rõ architecture trước khi biến các constants này thành database model.

---

# 14. AUTHENTICATION CURRENT STATE

Hiện chưa có authentication.

Không có:

* AuthModule
* login
* register
* JWT
* Passport
* JwtStrategy
* refresh token
* guards
* CurrentUser
* Roles decorator
* Permissions decorator
* password hashing

Password trên User entity hiện là varchar thường.

Khi implement User/Auth thật:

TUYỆT ĐỐI không lưu plain-text password.

Phải dùng password hashing an toàn như Argon2 hoặc bcrypt.

Password/hash không bao giờ được trả ra API response.

---

# 15. VALIDATION ISSUE CẦN XỬ LÝ

Media DTO đã dùng:

* class-validator
* class-transformer

Nhưng `main.ts` hiện chưa khai báo global ValidationPipe.

Do đó phải bổ sung cấu hình phù hợp, ví dụ các mục tiêu:

* transform
* whitelist
* forbidNonWhitelisted nếu architecture chọn strict input

Phải kiểm tra ảnh hưởng backward compatibility trước khi bật strict mode.

Không coi decorator validation là đủ nếu ValidationPipe chưa hoạt động.

---

# 16. SECURITY REQUIREMENTS

Khi tiếp tục project phải giữ hoặc bổ sung:

* không trả password/hash
* validation input
* MIME whitelist
* file size limit
* UUID validation
* path traversal protection
* ownership/authorization khi auth được triển khai
* tránh mass assignment
* database parameter binding
* upload cleanup khi DB fail
* transaction cho multi-step operation
* pessimistic locking khi concurrency có thể gây race condition

Không tin dữ liệu filename/MIME/path từ client ngoài những gì Multer/server xác nhận.

---

# 17. PRODUCTION DATABASE POLICY

Hiện:

`synchronize: true`

Được coi là development-only.

Khi project chuyển sang schema ổn định:

phải xây migration system.

Không dùng synchronize để update production schema.

Mọi thay đổi schema production phải có migration rõ ràng.

---

# 18. TEST CURRENT STATE

Test hiện chủ yếu chỉ kiểm tra class được tạo.

Media service có dependencies:

* Repository<Media>
* DataSource
* ConfigService

Do đó unit test phải mock đúng dependency.

Cần phát triển test cho các business rule quan trọng:

* media create
* upload DB failure cleanup
* bulk transaction rollback
* replace file transaction
* replace missing media
* delete
* repeated delete không reset retention
* restore
* expired restore
* hard-delete
* ENOENT
* filesystem error
* pagination
* filtering
* keyword search
* path traversal
* user CRUD khi được implement
* auth khi được implement

Không coi coverage scaffold hiện tại là coverage đủ.

---

# 19. TARGET ARCHITECTURE CHO WEBSITE BÁN HÀNG + BLOG

Các domain sau là ROADMAP, không phải code hiện hữu.

Nên phát triển theo thứ tự dependency.

## Phase 1 — Foundation

* Global ValidationPipe
* Environment validation
* Error response convention
* Database migrations
* User persistence
* Auth
* RBAC
* Media stabilization
* Logging

## Phase 2 — Catalog

* Category
* Brand
* Product
* Product Media
* Product Variant
* Product Attribute
* SKU
* Inventory

## Phase 3 — Customer commerce

* Customer/Profile
* Address
* Cart
* Cart Item
* Wishlist nếu requirement có

## Phase 4 — Checkout

* Order
* Order Item
* Order status
* Payment
* Shipping information
* Inventory reservation/reduction

## Phase 5 — Promotion

* Coupon
* Discount
* Promotion

Chỉ implement khi business requirement được xác định.

## Phase 6 — Blog

* Blog Post
* Blog Category
* Blog Tag
* Post Media
* SEO metadata
* publish/draft scheduling nếu requirement có

## Phase 7 — Admin

* User management
* Catalog management
* Order management
* Media library
* Blog management
* Role/permission management

---

# 20. DEVELOPMENT CONVENTIONS

Giữ architecture NestJS rõ ràng:

Controller
→ Service
→ Repository/TypeORM

Controller:

* nhận HTTP input
* pipe
* interceptor
* response concerns

Không đặt business logic lớn trong controller.

Service:

* business rules
* orchestration
* transactions
* persistence

DTO:

* request validation

Entity:

* persistence model

Không sử dụng Entity trực tiếp làm request DTO.

---

# 21. DTO CONVENTION

Mỗi resource nên có khi phù hợp:

* CreateXDto
* UpdateXDto
* SearchXDto / QueryXDto

Dùng:

* class-validator
* class-transformer

Pagination phải có giới hạn max để tránh query không giới hạn.

Không cho client update các internal fields như:

* id
* passwordHash trực tiếp
* status nội bộ nếu endpoint không cho phép
* createdAt
* updatedAt
* deletedAt

---

# 22. ERROR HANDLING

Dùng Nest exceptions phù hợp:

* BadRequestException
* UnauthorizedException
* ForbiddenException
* NotFoundException
* ConflictException

Không dùng generic Error cho expected business errors.

Thông báo lỗi hiện có bằng tiếng Việt có thể giữ để backward compatibility.

---

# 23. TRANSACTION RULES

Phải dùng transaction khi một operation thay đổi nhiều persistence resources phụ thuộc lẫn nhau.

Ví dụ:

* bulk media
* replace media
* checkout
* create order + items
* inventory update
* payment state update
* coupon usage increment

Không để database rơi vào partial state.

---

# 24. CONCURRENCY

Các nghiệp vụ dễ race condition phải được thiết kế chủ động.

Đặc biệt trong tương lai:

* inventory
* order creation
* coupon usage
* payment callback
* media replacement

Có thể sử dụng:

* database transaction
* pessimistic lock
* unique constraints
* idempotency key

tùy use case.

---

# 25. MEDIA REUSE

Không duplicate upload implementation cho:

* Product
* Category
* User avatar
* Blog
* Brand

Sử dụng MediaModule hiện tại làm media library chung.

Khi cần relation tới media, thiết kế relation/reference thích hợp thay vì copy file upload code sang từng module.

---

# 26. QUY TẮC KHI NHẬN FEATURE MỚI

Trước khi code bất kỳ feature nào:

1. Đọc lại các file liên quan trong repository.
2. Xác định current behavior.
3. Xác định entity hiện tại.
4. Xác định API hiện tại.
5. Xác định compatibility requirement.
6. Xác định database impact.
7. Xác định transaction requirement.
8. Xác định authentication/authorization.
9. Xác định validation.
10. Xác định test cases.

Sau đó mới code.

---

# 27. KHÔNG ĐƯỢC LÀM

Không:

* tự đổi endpoint hiện tại
* đổi response hiện tại không có lý do
* rename DB columns tùy tiện
* xóa business rule retention 7 ngày
* hard-delete media ngay khi DELETE
* reset retention khi DELETE lần hai
* bỏ cleanup file khi DB transaction fail
* bỏ path traversal protection
* hard-code DB credential
* lưu password plaintext
* trả password trong response
* sử dụng synchronize:true cho production
* giả định module không tồn tại là đã có
* thêm abstraction quá mức khi project chưa cần

---

# 28. SOURCE OF TRUTH FILES HIỆN TẠI

Khi có xung đột requirement, ưu tiên đọc implementation từ các file:

`src/app.module.ts`

`src/main.ts`

`src/modules/media/entities/media.entity.ts`

`src/modules/media/media.controller.ts`

`src/modules/media/media.service.ts`

`src/modules/media/media-storage.config.ts`

`src/modules/media/media-cleanup.service.ts`

`src/modules/media/dto/create-media.dto.ts`

`src/modules/media/dto/update-media.dto.ts`

`src/modules/media/dto/search-media.dto.ts`

`src/modules/user/entities/user.entity.ts`

`src/modules/user/user.controller.ts`

`src/modules/user/user.service.ts`

`src/modules/user/dto/create-user.dto.ts`

`src/modules/user/dto/update-user.dto.ts`

`src/config/constants/user.enum.ts`

`src/config/constants/user/user-role.constants.ts`

`src/config/constants/user/user-status.ts`

README hiện tại chủ yếu là README mặc định của NestJS.

Không dùng README đó làm business requirement.

---

# 29. RESPONSE FORMAT KHI ĐƯỢC YÊU CẦU IMPLEMENT FEATURE

Khi tôi yêu cầu implement một feature, trước tiên hãy trả:

## Current state

Các file/module hiện tại liên quan.

## Requirement

Bạn hiểu feature cần làm gì.

## Database changes

Entity/table/index/migration cần thay đổi.

## API changes

Endpoint/request/response.

## Business rules

Các rule cần bảo toàn.

## Security

Authentication/authorization/validation.

## Files to change

Danh sách file cụ thể.

Sau đó implement production-ready code.

Không trả pseudocode nếu có đủ context để code thật.

Không tạo TODO thay cho implementation có thể hoàn thành ngay.

---

# 30. FIRST PRIORITY

Nếu tôi yêu cầu:

"tiếp tục xây backend"

thì không nhảy ngay vào Product/Order.

Ưu tiên hoàn thiện nền tảng theo thứ tự:

1. Global ValidationPipe.
2. Environment validation.
3. Fix/stabilize tests.
4. Hoàn thiện User persistence.
5. Authentication.
6. Password hashing.
7. JWT access/refresh strategy.
8. Authorization/RBAC.
9. Migration infrastructure.
10. Sau đó mới triển khai Catalog/Product.

Mỗi phase phải giữ MediaModule đang hoạt động và tránh breaking API hiện tại.

Mục tiêu cuối cùng là xây một backend NestJS + TypeORM + MySQL production-ready cho website bán hàng + blog, nhưng mọi bước phải phát triển từ source hiện hữu chứ không rebuild tùy ý.
