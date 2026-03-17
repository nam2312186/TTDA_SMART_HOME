from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from building_app.models import Floor, Room
from .models import Device, DeviceType


class DeviceAppTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        floor = Floor.objects.create(floor_name='Floor 1')
        self.room = Room.objects.create(room_name='Living Room', floor=floor)
        self.device_type = DeviceType.objects.create(name_type='light')
        self.device = Device.objects.create(
            device_name='Smart Bulb',
            type=self.device_type,
            room=self.room,
            status=False,
        )


class DeviceTypeListTest(DeviceAppTestCase):
    def test_get_device_types(self):
        res = self.client.get('/api/device-types/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_device_type(self):
        payload = {'name_type': 'fan'}
        res = self.client.post('/api/device-types/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name_type'], 'fan')


class DeviceListTest(DeviceAppTestCase):
    def test_get_devices(self):
        res = self.client.get('/api/devices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_device(self):
        fan_type = DeviceType.objects.create(name_type='fan')
        payload = {
            'device_name': 'Fan',
            'type': fan_type.type_id,
            'room': self.room.room_id,
            'status': False,
        }
        res = self.client.post('/api/devices/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['device_name'], 'Fan')


class DeviceDetailTest(DeviceAppTestCase):
    def test_get_device(self):
        res = self.client.get(f'/api/devices/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['device_name'], 'Smart Bulb')

    def test_update_device(self):
        payload = {'device_name': 'Smart Bulb v2', 'status': True}
        res = self.client.put(f'/api/devices/{self.device.device_id}/', payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['device_name'], 'Smart Bulb v2')

    def test_delete_device(self):
        res = self.client.delete(f'/api/devices/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Device.objects.filter(device_id=self.device.device_id).exists())


class RoomDeviceListTest(DeviceAppTestCase):
    def test_get_devices_by_room(self):
        res = self.client.get(f'/api/rooms/{self.room.room_id}/devices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


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
        self.assertEqual(res.data['status'], (not initial))
