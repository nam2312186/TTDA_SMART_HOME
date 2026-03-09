from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users_app.models import Role, User
from building_app.models import Floor, Room
from .models import Device, Sensor


class DeviceAppTestCase(TestCase):
    """Setup chung: tạo Room để gán cho Device."""

    def setUp(self):
        self.client = APIClient()
        role = Role.objects.create(role_name='admin')
        user = User.objects.create(username='test', email='test@test.com', password='x', role_id=role)
        floor = Floor.objects.create(floor_name='Floor 1', user=user)
        self.room = Room.objects.create(room_name='Living Room', floor=floor, user=user)
        self.device = Device.objects.create(
            device_name='Smart Bulb',
            device_type='light',
            room=self.room,
            status=False,
        )
        self.sensor = Sensor.objects.create(
            sensor_type='temperature',
            device=self.device,
        )


# ── Devices CRUD ──────────────────────────────────────────────────────────────

class DeviceListTest(DeviceAppTestCase):
    def test_get_devices(self):
        res = self.client.get('/api/devices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_device(self):
        payload = {'device_name': 'Fan', 'device_type': 'fan', 'room': self.room.room_id, 'status': False}
        res = self.client.post('/api/devices/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['device_name'], 'Fan')


class DeviceDetailTest(DeviceAppTestCase):
    def test_get_device(self):
        res = self.client.get(f'/api/devices/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['device_name'], 'Smart Bulb')

    def test_update_device(self):
        payload = {'device_name': 'Smart Bulb v2', 'device_type': 'light', 'room': self.room.room_id, 'status': True}
        res = self.client.put(f'/api/devices/{self.device.device_id}/', payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['device_name'], 'Smart Bulb v2')

    def test_delete_device(self):
        res = self.client.delete(f'/api/devices/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Device.objects.filter(device_id=self.device.device_id).exists())

    def test_get_device_not_found(self):
        res = self.client.get('/api/devices/9999/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class RoomDeviceListTest(DeviceAppTestCase):
    def test_get_devices_by_room(self):
        res = self.client.get(f'/api/rooms/{self.room.room_id}/devices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


# ── Device Control ────────────────────────────────────────────────────────────

class DeviceControlTest(DeviceAppTestCase):
    def test_turn_on(self):
        res = self.client.post(f'/api/devices/{self.device.device_id}/on/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['status'])

    def test_turn_off(self):
        self.device.status = True
        self.device.save()
        res = self.client.post(f'/api/devices/{self.device.device_id}/off/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['status'])

    def test_toggle(self):
        initial = self.device.status
        res = self.client.post(f'/api/devices/{self.device.device_id}/toggle/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], not initial)


# ── Sensors CRUD ──────────────────────────────────────────────────────────────

class SensorListTest(DeviceAppTestCase):
    def test_get_sensors(self):
        res = self.client.get('/api/sensors/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_sensor(self):
        payload = {'sensor_type': 'humidity', 'device': self.device.device_id}
        res = self.client.post('/api/sensors/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['sensor_type'], 'humidity')


class SensorDetailTest(DeviceAppTestCase):
    def test_get_sensor(self):
        res = self.client.get(f'/api/sensors/{self.sensor.sensor_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_delete_sensor(self):
        res = self.client.delete(f'/api/sensors/{self.sensor.sensor_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Sensor.objects.filter(sensor_id=self.sensor.sensor_id).exists())

