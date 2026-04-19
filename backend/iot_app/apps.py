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

        from django.conf import settings
        if not getattr(settings, 'COREIOT_ENABLED', False):
            return
        if not getattr(settings, 'COREIOT_AUTO_SYNC_ON_RUNSERVER', True):
            return

        def _start_coreiot_sync():
            try:
                time.sleep(1.0)
                from iot_app.coreiot_sync import run_forever
                run_forever()
            except Exception as exc:
                logger.warning(f'CoreIoT auto sync skipped: {exc}')

        threading.Thread(target=_start_coreiot_sync, daemon=True).start()
