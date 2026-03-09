from django.test import TestCase, Client
from rest_framework import status
from .models import Floor, Room
from users_app.models import User, Role


class BuildingTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.role = Role.objects.create(role_name='Admin')
        self.user = User.objects.create(username='testuser', email='test@test.com', password='123456', role_id=self.role)
        self.floor = Floor.objects.create(floor_id=1, floor_name='Floor 1', user_id=self.user)
        self.room = Room.objects.create(room_id=1, room_name='Room 1', floor_id=self.floor, user_id=self.user)

    def test_get_floors(self):
        res = self.client.get('/api/floors/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_floor_detail(self):
        res = self.client.get(f'/api/floors/{self.floor.floor_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['floor_name'], 'Floor 1')

    def test_get_rooms(self):
        res = self.client.get('/api/rooms/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_room_detail(self):
        res = self.client.get(f'/api/rooms/{self.room.room_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['room_name'], 'Room 1')

    def test_get_floor_rooms(self):
        res = self.client.get(f'/api/floors/{self.floor.floor_id}/rooms/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
