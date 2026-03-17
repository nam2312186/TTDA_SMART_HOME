from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from building_app.models import Floor, Room
from devices_app.models import Device, DeviceType
from .models import Alert, SensorData, Threshold


class MonitoringTestCase(TestCase):
    """Setup chung cho monitoring tests."""

    def setUp(self):
        self.client = APIClient()
        floor = Floor.objects.create(floor_name='Floor 1')
        room = Room.objects.create(room_name='Living Room', floor=floor)
        device_type = DeviceType.objects.create(name_type='temperature')
        self.threshold = Threshold.objects.create(min_value=10.0, max_value=40.0)
        self.device = Device.objects.create(
            device_name='Temp Sensor', room=room, type=device_type, threshold=self.threshold
        )
        self.sensor_data = SensorData.objects.create(device=self.device, value=25.5, unit='C')
        self.alert = Alert.objects.create(threshold=self.threshold, message='Test alert', value=25.5)


class SensorDataListTest(MonitoringTestCase):
    def test_get_sensor_data(self):
        res = self.client.get('/api/sensor-data/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_post_sensor_data(self):
        payload = {'device': self.device.device_id, 'value': 30.0, 'unit': 'C'}
        res = self.client.post('/api/sensor-data/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(res.data['value']), 30.0)

    def test_post_sensor_data_triggers_alert_on_exceed(self):
        alert_count_before = Alert.objects.count()
        payload = {'device': self.device.device_id, 'value': 99.0, 'unit': 'C'}
        self.client.post('/api/sensor-data/', payload)
        self.assertGreater(Alert.objects.count(), alert_count_before)

    def test_get_latest_sensor_data(self):
        res = self.client.get('/api/sensor-data/latest/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_sensor_data_by_device_id(self):
        res = self.client.get(f'/api/sensor-data/device/{self.device.device_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


class ThresholdTest(MonitoringTestCase):
    def test_get_thresholds(self):
        res = self.client.get('/api/thresholds/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_create_threshold(self):
        payload = {'min_value': 20.0, 'max_value': 80.0}
        res = self.client.post('/api/thresholds/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_update_threshold(self):
        payload = {'min_value': 5.0, 'max_value': 35.0}
        res = self.client.put(f'/api/thresholds/{self.threshold.threshold_id}/', payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(res.data['max_value']), 35.0)

    def test_delete_threshold(self):
        res = self.client.delete(f'/api/thresholds/{self.threshold.threshold_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)


class AlertTest(MonitoringTestCase):
    def test_get_alerts(self):
        res = self.client.get('/api/alerts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_alert_detail(self):
        res = self.client.get(f'/api/alerts/{self.alert.alert_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['message'], 'Test alert')

    def test_delete_alert(self):
        res = self.client.delete(f'/api/alerts/{self.alert.alert_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Alert.objects.filter(alert_id=self.alert.alert_id).exists())
