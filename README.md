# Smart Home IoT Backend

## 1. Tạo file môi trường

Tạo file `.env` và copy nội dung từ `.env.example` vào:

```
cp .env.example .env
```


# 2. Build và chạy hệ thống

Chạy lệnh sau để build image và khởi động container:

```
docker compose up --build
```

Sau khi chạy, backend sẽ tự chạy tại:

```
http://localhost:8000
```


# 3. Chạy các lệnh Django

Mở **terminal khác** và chạy các lệnh sau khi cần:
### Sau khi chỉnh sửa code models, chạy lệnh sau để tạo migration:
### Tạo migration

```
docker compose exec backend python manage.py makemigrations <appname>
```

### Áp dụng migration

```
docker compose exec backend python manage.py migrate
```

### Tạo admin user

```
docker compose exec backend python manage.py createsuperuser
```

### Tạo app mới

```
docker compose exec backend python manage.py startapp <appname>
```

### Revert migration của app

```
docker compose exec backend python manage.py migrate <appname> zero
```

---

# 4. Dừng hệ thống

```
docker compose down
```
