from datetime import time

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from automation_app.models import AutomationRule, IsMonitor, Schedule
from building_app.models import Floor, Room, RoomManagement
from devices_app.models import Device, DeviceType
from logs_app.models import ActivityLog
from monitoring_app.models import Alert, SensorData, Threshold
from users_app.models import Role, User


class Command(BaseCommand):
    help = 'Seed data aligned with schema'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing app data before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Resetting data...'))
            Alert.objects.all().delete()
            SensorData.objects.all().delete()
            IsMonitor.objects.all().delete()
            AutomationRule.objects.all().delete()
            Schedule.objects.all().delete()
            ActivityLog.objects.all().delete()
            Device.objects.all().delete()
            Threshold.objects.all().delete()
            RoomManagement.objects.all().delete()
            Room.objects.all().delete()
            Floor.objects.all().delete()
            User.objects.all().delete()
            Role.objects.all().delete()
            DeviceType.objects.all().delete()

        # --- Roles & Users ---
        admin_role, _ = Role.objects.get_or_create(role_name='admin')
        user_role, _ = Role.objects.get_or_create(role_name='user')

        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@smarthome.com',
                'password': make_password('123456'),
                'role_id': admin_role,
            },
        )
        normal_user, _ = User.objects.get_or_create(
            username='user',
            defaults={
                'email': 'user@smarthome.com',
                'password': make_password('123456'),
                'role_id': user_role,
            },
        )

        # --- Device Types ---
        type_sensor, _ = DeviceType.objects.get_or_create(name_type='sensor')
        type_actuator, _ = DeviceType.objects.get_or_create(name_type='actuator')
        type_temp, _ = DeviceType.objects.get_or_create(name_type='temperature')
        type_humidity, _ = DeviceType.objects.get_or_create(name_type='humidity')
        type_light, _ = DeviceType.objects.get_or_create(name_type='light')
        type_fan, _ = DeviceType.objects.get_or_create(name_type='fan')

        # --- Floors & Rooms (3 floors layout) ---
        floor1, _ = Floor.objects.get_or_create(floor_name='Floor 1 - Demo')
        floor2, _ = Floor.objects.get_or_create(floor_name='Floor 2 - Demo')
        floor3, _ = Floor.objects.get_or_create(floor_name='Floor 3 - Demo')

        room_1a, _ = Room.objects.get_or_create(room_name='Demo Room 1A', floor=floor1)
        room_1b, _ = Room.objects.get_or_create(room_name='Demo Room 1B', floor=floor1)
        room_2a, _ = Room.objects.get_or_create(room_name='Demo Room 2A', floor=floor2)
        room_3a, _ = Room.objects.get_or_create(room_name='Demo Room 3A', floor=floor3)
        sensor_room, _ = Room.objects.get_or_create(room_name='Demo Room', floor=floor1)

        # --- Room Management ---
        RoomManagement.objects.get_or_create(user=normal_user, room=room_1a)
        RoomManagement.objects.get_or_create(user=normal_user, room=room_1b)
        RoomManagement.objects.get_or_create(user=normal_user, room=room_2a)
        RoomManagement.objects.get_or_create(user=normal_user, room=room_3a)
        RoomManagement.objects.get_or_create(user=normal_user, room=sensor_room)

        # --- Thresholds (standalone, tao truoc device) ---
        temp_threshold, _ = Threshold.objects.get_or_create(
            pk=1, defaults={'min_value': 18.0, 'max_value': 30.0}
        )
        humid_threshold, _ = Threshold.objects.get_or_create(
            pk=2, defaults={'min_value': 35.0, 'max_value': 80.0}
        )
        light_threshold, _ = Threshold.objects.get_or_create(
            pk=3, defaults={'min_value': 100.0, 'max_value': 500.0}
        )

        # --- Devices ---
        light_device_1, _ = Device.objects.update_or_create(
            device_name='Demo Light 1',
            defaults={'type': type_light, 'room': room_1a, 'status': False, 'threshold': None},
        )
        fan_device_1, _ = Device.objects.update_or_create(
            device_name='Demo Mini Fan 1',
            defaults={'type': type_fan, 'room': room_1b, 'status': False, 'threshold': None},
        )
        light_device_2, _ = Device.objects.update_or_create(
            device_name='Demo Light 2',
            defaults={'type': type_light, 'room': room_2a, 'status': False, 'threshold': None},
        )
        fan_device_2, _ = Device.objects.update_or_create(
            device_name='Demo Mini Fan 2',
            defaults={'type': type_fan, 'room': room_3a, 'status': False, 'threshold': None},
        )

        # Keep v7 sensor set and legacy fan room for backward-compatible demos.
        temp_device, _ = Device.objects.update_or_create(
            device_name='Demo Temp Sensor Device',
            defaults={'type': type_temp, 'room': sensor_room, 'status': True, 'threshold': temp_threshold},
        )
        humid_device, _ = Device.objects.update_or_create(
            device_name='Demo Humidity Sensor Device',
            defaults={'type': type_humidity, 'room': sensor_room, 'status': True, 'threshold': humid_threshold},
        )
        light_sensor_device, _ = Device.objects.update_or_create(
            device_name='Demo Light Sensor Device',
            defaults={'type': type_light, 'room': sensor_room, 'status': True, 'threshold': light_threshold},
        )
        legacy_fan_device, _ = Device.objects.update_or_create(
            device_name='Demo Mini Fan',
            defaults={'type': type_fan, 'room': sensor_room, 'status': False, 'threshold': None},
        )

        # --- Schedule (room-based theo schema moi) ---
        Schedule.objects.get_or_create(
            room=room_3a,
            action='off',
            schedule_time=time(hour=22, minute=30),
            repeat_type='daily',
            defaults={'status': True},
        )

        # --- Automation Rule ---
        rule, _ = AutomationRule.objects.get_or_create(
            action='turn_on_fan',
            defaults={'status': True, 'threshold': temp_threshold},
        )
        IsMonitor.objects.get_or_create(device=fan_device_1, rule=rule)

        # --- Activity Log ---
        ActivityLog.objects.get_or_create(
            user=admin_user,
            device=fan_device_1,
            action='seed_data_initialized',
        )

        self.stdout.write(self.style.SUCCESS('Seed complete (schema-aligned, no IoT sample readings).'))
        self.stdout.write('Default accounts: admin@smarthome.com / 123456, user@smarthome.com / 123456')
