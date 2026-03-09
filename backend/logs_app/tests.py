from django.test import TestCase, Client
from rest_framework import status
from .models import ActivityLog
from building_app.models import Floor, Room
from devices_app.models import Device
from users_app.models import User, Role


class LogsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.role = Role.objects.create(role_name='Admin')
        self.user = User.objects.create(username='testuser', email='test@test.com', password='123456', role_id=self.role)
        self.floor = Floor.objects.create(floor_id=1, floor_name='Floor 1', user_id=self.user)
        self.room = Room.objects.create(room_id=1, room_name='Room 1', floor_id=self.floor, user_id=self.user)
        self.device = Device.objects.create(device_id=1, device_name='Light 1', device_type='light', room_id=self.room.room_id, status=True)
        self.activity = ActivityLog.objects.create(
            log_id=1,
            user_id=self.user,
            device_id=self.device,
            action='turned_on'
        )

    def test_get_logs(self):
        res = self.client.get('/api/logs/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_device_logs(self):
        res = self.client.get(f'/api/logs/device/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['device_id'], self.device.device_id)
        self.assertEqual(res.data['count'], 1)

    def test_get_user_logs(self):
        res = self.client.get(f'/api/logs/user/{self.user.user_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user_id'], self.user.user_id)
        self.assertEqual(res.data['count'], 1)
