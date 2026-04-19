import os
import django
import time
import random
from asgiref.sync import async_to_sync

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from devices_app.models import Device
from monitoring_app.models import SensorData
from iot_app.broadcast import broadcast_sensor_update

def run():
    print('Starting pure dummy simulator...')

    sensors = Device.objects.all()
    temp_sensor = sensors.filter(type__name_type__icontains='temp').first()
    hum_sensor = sensors.filter(type__name_type__icontains='humid').first()
    light_sensor = sensors.filter(type__name_type__icontains='light').first()
    motion_sensor = sensors.filter(type__name_type__icontains='motion').first()

    while True:
        t = round(random.uniform(25.0, 35.0), 1)
        h = round(random.uniform(50.0, 80.0), 1)
        l = round(random.uniform(100.0, 500.0), 1)
        m = random.choice([0, 1])

        try:
            for dev, v, u, metric in [(temp_sensor, t, 'C', 'temperature'), (hum_sensor, h, '%', 'humidity'), (light_sensor, l, 'lux', 'light'), (motion_sensor, m, '', 'motion')]:
                if dev:
                    SensorData.objects.create(device=dev, value=v, unit=u)
                    broadcast_sensor_update(sensor_id=dev.pk, value=v, unit=u, device_id=dev.pk, metric=metric)

            print(f"Sent: Temp={t}C, Hum={h}%, Light={l}lx, Motion={m}")
            time.sleep(2)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(2)

if __name__ == '__main__':
    run()
