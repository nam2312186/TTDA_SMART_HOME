from datetime import time

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from automation_app.models import Schedule
from building_app.models import Floor, Room
from devices_app.models import Device, Sensor
from logs_app.models import ActivityLog
from monitoring_app.models import Alert, SensorData, Threshold
from users_app.models import Role, User


class Command(BaseCommand):
    help = 'Seed data aligned with PostgreSQL schema'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing app data before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Resetting data...'))
            Alert.objects.all().delete()
            SensorData.objects.all().delete()
            Threshold.objects.all().delete()
            Schedule.objects.all().delete()
            ActivityLog.objects.all().delete()
            Sensor.objects.all().delete()
            Device.objects.all().delete()
            Room.objects.all().delete()
            Floor.objects.all().delete()
            User.objects.all().delete()
            Role.objects.all().delete()

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

        floor1, _ = Floor.objects.get_or_create(floor_name='Floor 1 - Common', defaults={'user': admin_user})
        floor2, _ = Floor.objects.get_or_create(floor_name='Floor 2 - Private', defaults={'user': admin_user})

        living_room, _ = Room.objects.get_or_create(room_name='Living Room', floor=floor1, defaults={'user': normal_user})
        kitchen, _ = Room.objects.get_or_create(room_name='Kitchen', floor=floor1, defaults={'user': normal_user})
        bedroom, _ = Room.objects.get_or_create(room_name='Bedroom', floor=floor2, defaults={'user': normal_user})

        temp_device, _ = Device.objects.get_or_create(
            device_name='Living Room Temp Sensor Device',
            defaults={'device_type': Device.TYPE_SENSOR, 'room': living_room, 'status': True},
        )
        humid_device, _ = Device.objects.get_or_create(
            device_name='Living Room Humidity Sensor Device',
            defaults={'device_type': Device.TYPE_SENSOR, 'room': living_room, 'status': True},
        )
        light_device, _ = Device.objects.get_or_create(
            device_name='Kitchen Light Sensor Device',
            defaults={'device_type': Device.TYPE_SENSOR, 'room': kitchen, 'status': True},
        )
        fan_device, _ = Device.objects.get_or_create(
            device_name='Bedroom Fan',
            defaults={'device_type': Device.TYPE_ACTUATOR, 'room': bedroom, 'status': False},
        )

        temp_sensor, _ = Sensor.objects.get_or_create(sensor_type='temperature', device=temp_device)
        humid_sensor, _ = Sensor.objects.get_or_create(sensor_type='humidity', device=humid_device)
        light_sensor, _ = Sensor.objects.get_or_create(sensor_type='light', device=light_device)

        SensorData.objects.get_or_create(sensor=temp_sensor, value=25.9, unit='C')
        SensorData.objects.get_or_create(sensor=humid_sensor, value=61.0, unit='%')
        SensorData.objects.get_or_create(sensor=light_sensor, value=210.0, unit='lux')

        Threshold.objects.get_or_create(sensor=temp_sensor, defaults={'min_value': 18.0, 'max_value': 30.0})
        Threshold.objects.get_or_create(sensor=humid_sensor, defaults={'min_value': 35.0, 'max_value': 80.0})
        Threshold.objects.get_or_create(sensor=light_sensor, defaults={'min_value': 100.0, 'max_value': 500.0})

        Alert.objects.get_or_create(
            sensor=temp_sensor,
            message='Temperature exceeded threshold in Living Room',
            defaults={'is_read': False},
        )

        Schedule.objects.get_or_create(
            device=fan_device,
            action='off',
            schedule_time=time(hour=22, minute=30),
            repeat_type='daily',
            defaults={'status': True},
        )

        ActivityLog.objects.get_or_create(
            user=admin_user,
            device=fan_device,
            action='seed_data_initialized',
        )

        self.stdout.write(self.style.SUCCESS('Seed complete (schema-aligned).'))
        self.stdout.write('Default accounts: admin@smarthome.com / 123456, user@smarthome.com / 123456')
