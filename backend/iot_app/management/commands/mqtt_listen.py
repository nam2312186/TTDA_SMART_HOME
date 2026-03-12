"""
Management command: python manage.py mqtt_listen
Khởi động MQTT subscriber — lắng nghe dữ liệu từ thiết bị IoT.
"""

import logging
import time
from django.core.management.base import BaseCommand

logger = logging.getLogger('iot_app.mqtt')


class Command(BaseCommand):
    help = 'Khởi động MQTT client lắng nghe dữ liệu IoT từ broker'

    def add_arguments(self, parser):
        parser.add_argument('--broker', type=str, help='MQTT broker host (mặc định từ settings)')
        parser.add_argument('--port', type=int, help='MQTT broker port (mặc định 1883)')

    def handle(self, *args, **options):
        from iot_app.mqtt_client import create_mqtt_client

        client, broker, port = create_mqtt_client()

        # Override nếu truyền qua CLI
        if options.get('broker'):
            broker = options['broker']
        if options.get('port'):
            port = options['port']

        self.stdout.write(self.style.SUCCESS(f'Đang kết nối MQTT broker: {broker}:{port}'))
        self.stdout.write('Topic lắng nghe:')
        self.stdout.write('  smarthome/device/+/sensor/+  (dữ liệu cảm biến)')
        self.stdout.write('  smarthome/device/+/status    (trạng thái thiết bị)')
        self.stdout.write('Nhấn Ctrl+C để dừng\n')

        try:
            client.connect(broker, port, keepalive=60)
            client.loop_forever()
        except ConnectionRefusedError:
            self.stderr.write(self.style.ERROR(
                f'Không thể kết nối broker {broker}:{port}. '
                'Hãy chắc chắn Mosquitto đang chạy.'
            ))
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nDừng MQTT listener.'))
            client.disconnect()
