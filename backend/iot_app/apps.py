from django.apps import AppConfig
import logging
import os
import sys
import threading
import time


logger = logging.getLogger('iot_app.startup')


class IotAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'iot_app'
    verbose_name = 'IoT Integration'

    def ready(self):
        # Only run once in Django autoreload child process for runserver.
        if 'runserver' not in sys.argv:
            return
        if os.environ.get('RUN_MAIN') != 'true':
            return

        def _publish_initial_state():
            try:
                time.sleep(1.0)
                from iot_app.mqtt_client import create_mqtt_client, publish_initial_light_states

                client, broker, port = create_mqtt_client()
                client.connect(broker, port, keepalive=60)
                client.loop_start()
                publish_initial_light_states(client)
                client.loop_stop()
                client.disconnect()
            except Exception as exc:
                logger.warning(f'Initial light state publish skipped: {exc}')

        threading.Thread(target=_publish_initial_state, daemon=True).start()
