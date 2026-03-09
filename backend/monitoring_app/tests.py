from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from users_app.models import Role, User
from building_app.models import Floor, Room
from devices_app.models import Device, Sensor
from .models import SensorData, Threshold, Alert


class MonitoringTestCase(TestCase):
    """Setup chung cho monitoring tests."""

    def setUp(self):
        self.client = APIClient()
        role = Role.objects.create(role_name='admin')
        user = User.objects.create(username='test', email='test@test.com', password='x', role_id=role)
        floor = Floor.objects.create(floor_name='Floor 1', user=user)
        room = Room.objects.create(room_name='Living Room', floor=floor, user=user)
        device = Device.objects.create(device_name='Temp Sensor', device_type='sensor', room=room)
        self.sensor = Sensor.objects.create(sensor_type='temperature', device=device)
        self.sensor_data = SensorData.objects.create(sensor=self.sensor, value=25.5, unit='C')
        self.threshold = Threshold.objects.create(sensor=self.sensor, min_value=10.0, max_value=40.0)
        self.alert = Alert.objects.create(sensor=self.sensor, message='Test alert', is_read=False)


# ── Sensor Data ───────────────────────────────────────────────────────────────

class SensorDataListTest(MonitoringTestCase):
    def test_get_sensor_data(self):
        res = self.client.get('/api/sensor-data/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_post_sensor_data(self):
        payload = {'sensor': self.sensor.sensor_id, 'value': 30.0, 'unit': 'C'}
        res = self.client.post('/api/sensor-data/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(res.data['value']), 30.0)

    def test_post_sensor_data_triggers_alert_on_exceed(self):
        """Gửi giá trị vượt ngưỡng max → tự tạo Alert."""
        alert_count_before = Alert.objects.count()
        payload = {'sensor': self.sensor.sensor_id, 'value': 99.0, 'unit': 'C'}
        self.client.post('/api/sensor-data/', payload)
        self.assertGreater(Alert.objects.count(), alert_count_before)

    def test_get_latest_sensor_data(self):
        res = self.client.get('/api/sensor-data/latest/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_sensor_data_by_sensor_id(self):
        res = self.client.get(f'/api/sensor-data/{self.sensor.sensor_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


# ── Thresholds ────────────────────────────────────────────────────────────────

class ThresholdTest(MonitoringTestCase):
    def test_get_thresholds(self):
        res = self.client.get('/api/thresholds/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_threshold(self):
        # Tạo sensor mới vì sensor hiện tại đã có threshold (OneToOne)
        device2 = Device.objects.get(device_name='Temp Sensor')
        sensor2 = Sensor.objects.create(sensor_type='humidity', device=device2)
        payload = {'sensor': sensor2.sensor_id, 'min_value': 20.0, 'max_value': 80.0}
        res = self.client.post('/api/thresholds/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_update_threshold(self):
        payload = {'sensor': self.sensor.sensor_id, 'min_value': 5.0, 'max_value': 35.0}
        res = self.client.put(f'/api/thresholds/{self.threshold.threshold_id}/', payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(res.data['max_value']), 35.0)

    def test_delete_threshold(self):
        res = self.client.delete(f'/api/thresholds/{self.threshold.threshold_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertTest(MonitoringTestCase):
    def test_get_alerts(self):
        res = self.client.get('/api/alerts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_alert_detail(self):
        res = self.client.get(f'/api/alerts/{self.alert.alert_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['message'], 'Test alert')

    def test_mark_alert_read(self):
        res = self.client.put(f'/api/alerts/{self.alert.alert_id}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_read'])

    def test_delete_alert(self):
        res = self.client.delete(f'/api/alerts/{self.alert.alert_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Alert.objects.filter(alert_id=self.alert.alert_id).exists())

