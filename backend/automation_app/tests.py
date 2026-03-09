from django.test import TestCase, Client
from rest_framework import status
import json
from .models import Schedule
from building_app.models import Floor, Room
from devices_app.models import Device
from users_app.models import User, Role


class AutomationTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.role = Role.objects.create(role_name='Admin')
        self.user = User.objects.create(username='testuser', email='test@test.com', password='123456', role_id=self.role)
        self.floor = Floor.objects.create(floor_id=1, floor_name='Floor 1', user_id=self.user)
        self.room = Room.objects.create(room_id=1, room_name='Room 1', floor_id=self.floor, user_id=self.user)
        self.device = Device.objects.create(device_id=1, device_name='Light 1', device_type='light', room_id=self.room.room_id, status=True)
        self.schedule = Schedule.objects.create(
            schedule_id=2,
            device_id=self.device,
            action='ON',
            schedule_time='08:00:00',
            repeat_type='DAILY',
            status=True
        )

    def test_get_schedules(self):
        res = self.client.get('/api/schedules/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_schedule_detail(self):
        res = self.client.get(f'/api/schedules/{self.schedule.schedule_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['action'], 'ON')

    def test_create_schedule(self):
        data = {
            'device_id': self.device.device_id,
            'action': 'OFF',
            'schedule_time': '09:00:00',
            'repeat_type': 'WEEKLY',
            'status': False
        }
        res = self.client.post('/api/schedules/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['action'], 'OFF')
        self.assertNotEqual(res.data['schedule_id'], self.schedule.schedule_id)

    def test_update_schedule(self):
        data = {
            'device_id': self.device.device_id,
            'action': 'OFF',
            'schedule_time': '10:00:00',
            'repeat_type': 'MONTHLY',
            'status': False
        }
        res = self.client.put(f'/api/schedules/{self.schedule.schedule_id}/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['action'], 'OFF')

    def test_delete_schedule(self):
        res = self.client.delete(f'/api/schedules/{self.schedule.schedule_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Schedule.objects.filter(schedule_id=self.schedule.schedule_id).exists())
