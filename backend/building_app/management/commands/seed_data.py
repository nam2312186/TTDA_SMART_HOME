"""
Management command: seed_data
==============================
Tạo dữ liệu mặc định cho hệ thống Smart Home:
  - Roles: admin, user
  - Users: admin / user
  - 5 Floors với 20 Rooms
  - UserRoomPermission mẫu cho user
    - Một bộ thiết bị demo nhỏ để test trước khi nối thiết bị thật

Chạy:
    python manage.py seed_data
    python manage.py seed_data --reset    # xóa data cũ rồi seed lại
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta, time


FLOORS_DATA = [
    {
        'floor_name': 'Floor 1 - Common Areas',
        'level': 1,
        'rooms': [
            'Living Room',
            'Kitchen',
            'Dining Room',
            'Garage',
            'Hallway',
        ],
    },
    {
        'floor_name': 'Floor 2 - Rest & Sleep',
        'level': 2,
        'rooms': [
            'Master Bedroom',
            'Bedroom 2',
            'Bathroom 1',
            'Home Office',
        ],
    },
    {
        'floor_name': 'Floor 3 - Bedrooms',
        'level': 3,
        'rooms': [
            'Bedroom 3',
            'Bedroom 4',
            'Bathroom 2',
            'Gym Room',
        ],
    },
    {
        'floor_name': 'Floor 4 - Utilities',
        'level': 4,
        'rooms': [
            'Entertainment Room',
            'Laundry Room',
            'Storage Room',
            'Balcony',
        ],
    },
    {
        'floor_name': 'Floor 5 - Technical',
        'level': 5,
        'rooms': [
            'Rooftop',
            'Server Room',
            'Security Room',
        ],
    },
]

USERS_DATA = [
    {
        'username': 'admin',
        'email': 'admin@smarthome.com',
        'password': '123456',
        'role_name': 'admin',
    },
    {
        'username': 'user',
        'email': 'user@smarthome.com',
        'password': '123456',
        'role_name': 'user',
    },
]

# Rooms được cấp quyền mặc định cho tài khoản "user"
DEFAULT_USER_PERMISSIONS = [
    'Living Room',
    'Kitchen',
    'Dining Room',
]

DEMO_DEVICES = [
    {
        'device_name': 'Living Room Temp Sensor',
        'device_type': 'sensor',
        'device_subtype': 'temperature',
        'room_name': 'Living Room',
        'description': 'Thiết bị mẫu để test nhiệt độ realtime trước khi nối sensor thật.',
        'unit': 'C',
        'status': False,
        'threshold': {
            'min_value': 18.0,
            'max_value': 30.0,
            'trigger_action_target': 'Living Room Ventilation Fan',
            'trigger_action': 'turn_on',
        },
        'history': [22.4, 23.1, 24.0, 25.2, 31.5],
    },
    {
        'device_name': 'Living Room Humidity Sensor',
        'device_type': 'sensor',
        'device_subtype': 'humidity',
        'room_name': 'Living Room',
        'description': 'Thiết bị mẫu để test độ ẩm và dashboard theo phòng/tầng.',
        'unit': '%',
        'status': False,
        'history': [55.0, 57.5, 58.2, 60.1, 59.4],
    },
    {
        'device_name': 'Living Room Light Sensor',
        'device_type': 'sensor',
        'device_subtype': 'light',
        'room_name': 'Living Room',
        'description': 'Thiết bị mẫu để test ánh sáng.',
        'unit': 'lux',
        'status': False,
        'history': [120.0, 180.0, 220.0, 260.0, 210.0],
    },
    {
        'device_name': 'Living Room Ventilation Fan',
        'device_type': 'actuator',
        'device_subtype': 'fan',
        'room_name': 'Living Room',
        'description': 'Actuator mẫu để test auto action khi vượt ngưỡng nhiệt độ.',
        'unit': None,
        'status': False,
    },
]

DEMO_SCHEDULES = [
    {
        'name': 'Living Room Morning Check',
        'scope_type': 'room',
        'room_name': 'Living Room',
        'action': 'toggle',
        'schedule_time': time(hour=7, minute=0),
        'repeat_type': 'weekday',
        'days_of_week': [1, 2, 3, 4, 5],
        'status': True,
    },
    {
        'name': 'Fan Cooldown Routine',
        'scope_type': 'device',
        'device_name': 'Living Room Ventilation Fan',
        'action': 'off',
        'schedule_time': time(hour=22, minute=30),
        'repeat_type': 'daily',
        'days_of_week': [0, 1, 2, 3, 4, 5, 6],
        'status': True,
    },
]


class Command(BaseCommand):
    help = 'Seed dữ liệu mặc định: roles, users, floors, rooms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Xóa toàn bộ data cũ (floors, rooms, users, roles) rồi seed lại',
        )

    def handle(self, *args, **options):
        from users_app.models import Role, User
        from building_app.models import Floor, Room, UserRoomPermission
        from devices_app.models import Device
        from monitoring_app.models import SensorData, Threshold
        from automation_app.models import Schedule
        from iot_app.models import IoTToken
        from logs_app.utils import create_activity_log
        from monitoring_app.views import _check_threshold

        if options['reset']:
            self.stdout.write(self.style.WARNING('⚠  Reset mode: đang xóa data cũ...'))
            UserRoomPermission.objects.all().delete()
            Room.objects.all().delete()
            Floor.objects.all().delete()
            User.objects.all().delete()
            Role.objects.all().delete()
            self.stdout.write('   Đã xóa xong.\n')

        # ── 1. Roles ──────────────────────────────────────────────────────────
        self.stdout.write('📋 Tạo Roles...')
        roles = {}
        for role_name in ('admin', 'user'):
            role, created = Role.objects.get_or_create(role_name=role_name)
            roles[role_name] = role
            status = 'tạo mới' if created else 'đã tồn tại'
            self.stdout.write(f'   Role "{role_name}" — {status}')

        # ── 2. Users ──────────────────────────────────────────────────────────
        self.stdout.write('👤 Tạo Users...')
        created_users = {}
        for udata in USERS_DATA:
            user, created = User.objects.get_or_create(
                username=udata['username'],
                defaults={
                    'email': udata['email'],
                    'password': make_password(udata['password']),
                    'role_id': roles[udata['role_name']],
                },
            )
            created_users[udata['username']] = user
            status = 'tạo mới' if created else 'đã tồn tại'
            self.stdout.write(
                f'   User "{udata["username"]}" ({udata["email"]}) — {status}'
            )

        # ── 3. Floors & Rooms ─────────────────────────────────────────────────
        self.stdout.write('🏢 Tạo Floors & Rooms...')
        created_rooms: dict[str, Room] = {}

        for fdata in FLOORS_DATA:
            floor, created = Floor.objects.get_or_create(
                floor_name=fdata['floor_name'],
                defaults={'level': fdata['level']},
            )
            fstatus = 'tạo mới' if created else 'đã tồn tại'
            self.stdout.write(f'   Floor "{fdata["floor_name"]}" — {fstatus}')

            for room_name in fdata['rooms']:
                room, rcreated = Room.objects.get_or_create(
                    room_name=room_name,
                    floor=floor,
                )
                created_rooms[room_name] = room
                rstatus = 'tạo mới' if rcreated else 'đã tồn tại'
                self.stdout.write(f'      Room "{room_name}" — {rstatus}')

        # ── 4. Default UserRoomPermissions ────────────────────────────────────
        self.stdout.write('🔑 Gán quyền mặc định cho user...')
        regular_user = created_users.get('user')
        admin_user = created_users.get('admin')
        if regular_user:
            for room_name in DEFAULT_USER_PERMISSIONS:
                room = created_rooms.get(room_name)
                if room:
                    _, created = UserRoomPermission.objects.get_or_create(
                        user=regular_user,
                        room=room,
                    )
                    status = 'tạo mới' if created else 'đã tồn tại'
                    self.stdout.write(f'   {regular_user.username} → {room_name} — {status}')

        # ── 5. Demo Devices, Sensor Data, Thresholds, Tokens ─────────────────
        self.stdout.write('🧪 Tạo bộ thiết bị demo nhỏ để test...')
        demo_devices = {}
        for ddata in DEMO_DEVICES:
            room = created_rooms.get(ddata['room_name'])
            if not room:
                self.stdout.write(self.style.WARNING(f'   Bỏ qua {ddata["device_name"]}: không tìm thấy room {ddata["room_name"]}'))
                continue

            device, created = Device.objects.update_or_create(
                device_name=ddata['device_name'],
                defaults={
                    'device_type': ddata['device_type'],
                    'device_subtype': ddata['device_subtype'],
                    'room': room,
                    'description': ddata['description'],
                    'unit': ddata['unit'],
                    'status': ddata.get('status', False),
                },
            )
            demo_devices[ddata['device_name']] = device
            dstatus = 'tạo mới' if created else 'cập nhật'
            self.stdout.write(f'   Device "{device.device_name}" — {dstatus}')

        for ddata in DEMO_DEVICES:
            if ddata['device_type'] != Device.TYPE_SENSOR:
                continue
            device = demo_devices.get(ddata['device_name'])
            if not device:
                continue

            threshold_config = ddata.get('threshold')
            if threshold_config:
                target_device = demo_devices.get(threshold_config.get('trigger_action_target'))
                Threshold.objects.update_or_create(
                    device=device,
                    defaults={
                        'min_value': threshold_config.get('min_value'),
                        'max_value': threshold_config.get('max_value'),
                        'trigger_action': threshold_config.get('trigger_action', 'none'),
                        'target_device': target_device,
                    },
                )
                self.stdout.write(f'   Threshold cho "{device.device_name}" — ok')

            token, token_created = IoTToken.objects.get_or_create(
                device=device,
                defaults={'label': f'Demo token for {device.device_name}'},
            )
            if not token.label:
                token.label = f'Demo token for {device.device_name}'
                token.save(update_fields=['label'])
            self.stdout.write(
                f'   IoT Token cho "{device.device_name}" — '
                f'{"tạo mới" if token_created else "đã tồn tại"}'
            )

            history_values = ddata.get('history', [])
            now = timezone.now()
            SensorData.objects.filter(device=device).delete()
            created_entries = []
            for index, value in enumerate(history_values):
                entry = SensorData.objects.create(
                    device=device,
                    value=value,
                    metric=device.device_subtype,
                    unit=device.unit,
                )
                recorded_at = now - timedelta(hours=(len(history_values) - index) * 3)
                SensorData.objects.filter(pk=entry.pk).update(recorded_at=recorded_at)
                entry.recorded_at = recorded_at
                created_entries.append(entry)

            if created_entries:
                latest = created_entries[-1]
                device.current_value = latest.value
                device.last_reading_at = latest.recorded_at
                device.unit = latest.unit or device.unit
                device.save(update_fields=['current_value', 'last_reading_at', 'unit', 'updated_at'])
                _check_threshold(latest, source='system')

            create_activity_log(
                user=admin_user,
                device=device,
                category='device',
                action='demo_device_seeded',
                details=f'Tạo dữ liệu demo cho {device.device_name}',
                metadata={
                    'device_id': device.device_id,
                    'device_type': device.device_type,
                    'device_subtype': device.device_subtype,
                    'sample_count': len(history_values),
                    'seed_source': 'management_command',
                },
            )

        # ── 6. Demo Schedules ────────────────────────────────────────────────
        self.stdout.write('⏰ Tạo schedule mẫu...')
        for sdata in DEMO_SCHEDULES:
            room = created_rooms.get(sdata.get('room_name')) if sdata.get('room_name') else None
            device = demo_devices.get(sdata.get('device_name')) if sdata.get('device_name') else None
            schedule, created = Schedule.objects.update_or_create(
                name=sdata['name'],
                defaults={
                    'scope_type': sdata['scope_type'],
                    'room': room,
                    'device': device,
                    'action': sdata['action'],
                    'schedule_time': sdata['schedule_time'],
                    'repeat_type': sdata['repeat_type'],
                    'days_of_week': sdata['days_of_week'],
                    'status': sdata['status'],
                },
            )
            self.stdout.write(f'   Schedule "{schedule.name}" — {"tạo mới" if created else "cập nhật"}')

        self.stdout.write(self.style.SUCCESS('\n✅ Seed hoàn thành!'))
        self.stdout.write('')
        self.stdout.write('Tài khoản mặc định:')
        self.stdout.write('  admin@smarthome.com / 123456  (Admin — toàn quyền)')
        self.stdout.write('  user@smarthome.com  / 123456  (User  — Living Room, Kitchen, Dining Room)')
        self.stdout.write('')
        self.stdout.write('Thiết bị demo để test nhanh:')
        for ddata in DEMO_DEVICES:
            device = demo_devices.get(ddata['device_name'])
            if not device:
                continue
            self.stdout.write(f'  - {device.device_name} [{device.device_type}/{device.device_subtype}] @ {device.room.room_name}')
            if device.device_type == Device.TYPE_SENSOR and hasattr(device, 'iot_token'):
                self.stdout.write(f'    token: {device.iot_token.token}')
        self.stdout.write('')
        self.stdout.write('Thiết bị thật có thể dùng chính token của device demo để push dữ liệu thật, dữ liệu trên app sẽ tự cập nhật theo record hiện tại.')
