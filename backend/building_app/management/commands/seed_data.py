"""
Management command: seed_data
==============================
Tạo dữ liệu mặc định cho hệ thống Smart Home:
  - Roles: admin, user
  - Users: admin / user
  - 5 Floors với 20 Rooms
  - UserRoomPermission mẫu cho user

Chạy:
    python manage.py seed_data
    python manage.py seed_data --reset    # xóa data cũ rồi seed lại
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password


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

        self.stdout.write(self.style.SUCCESS('\n✅ Seed hoàn thành!'))
        self.stdout.write('')
        self.stdout.write('Tài khoản mặc định:')
        self.stdout.write('  admin@smarthome.com / 123456  (Admin — toàn quyền)')
        self.stdout.write('  user@smarthome.com  / 123456  (User  — Living Room, Kitchen, Dining Room)')
